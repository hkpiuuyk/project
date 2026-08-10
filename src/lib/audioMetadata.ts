export async function parseAudioMetadata(file: File): Promise<{ title?: string; artist?: string; coverUrl?: string }> {
  return new Promise((resolve) => {
    const rawName = file.name.replace(/\.[^/.]+$/, '')
    let fallbackTitle = rawName
    let fallbackArtist = '알 수 없는 아티스트'

    if (rawName.includes('-')) {
      const parts = rawName.split('-')
      fallbackArtist = parts[0].trim()
      fallbackTitle = parts.slice(1).join('-').trim()
    }

    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer || buffer.byteLength < 10) return resolve({ title: fallbackTitle, artist: fallbackArtist })

      const view = new DataView(buffer)

      // ID3 태그 검사 ('ID3')
      if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
        return resolve({ title: fallbackTitle, artist: fallbackArtist })
      }

      const majorVersion = view.getUint8(3) // v2.2, v2.3, v2.4
      const tagSize = ((view.getUint8(6) & 0x7f) << 21) |
        ((view.getUint8(7) & 0x7f) << 14) |
        ((view.getUint8(8) & 0x7f) << 7) |
        (view.getUint8(9) & 0x7f)

      let offset = 10
      let title: string | undefined
      let artist: string | undefined
      let coverUrl: string | undefined

      // 인코딩 바이트 및 EUC-KR / UTF-8 / UTF-16 디코더
      const decodeFrameText = (bytes: Uint8Array): string => {
        if (bytes.length === 0) return ''
        const encoding = bytes[0] // 0: ISO-8859-1/EUC-KR, 1: UTF-16 with BOM, 2: UTF-16BE, 3: UTF-8
        const textData = bytes.subarray(1)

        try {
          if (encoding === 1) {
            const isBigEndian = textData[0] === 0xfe && textData[1] === 0xff
            const utf16Decoder = new TextDecoder(isBigEndian ? 'utf-16be' : 'utf-16le')
            return utf16Decoder.decode(textData).replace(/\0/g, '').trim()
          } else if (encoding === 2) {
            const utf16BeDecoder = new TextDecoder('utf-16be')
            return utf16BeDecoder.decode(textData).replace(/\0/g, '').trim()
          } else if (encoding === 3) {
            const utf8Decoder = new TextDecoder('utf-8')
            return utf8Decoder.decode(textData).replace(/\0/g, '').trim()
          } else {
            // 0일 때: 한글 CP949 / EUC-KR 시도 후 UTF-8 Fallback
            try {
              const eucText = new TextDecoder('euc-kr').decode(textData).replace(/\0/g, '').trim()
              if (eucText.length > 0 && !eucText.includes('\uFFFD')) return eucText
            } catch { }
            return new TextDecoder('utf-8').decode(textData).replace(/\0/g, '').trim()
          }
        } catch {
          return ''
        }
      }

      while (offset < tagSize + 10 && offset + 10 < buffer.byteLength) {
        // ID3v2.2는 프레임 ID가 3글자, v2.3/v2.4는 4글자
        const isV22 = majorVersion === 2
        const frameIdLen = isV22 ? 3 : 4
        const headerLen = isV22 ? 6 : 10

        const frameId = String.fromCharCode(...new Uint8Array(buffer, offset, frameIdLen))
        if (frameId.charCodeAt(0) === 0) break // 패딩 진입 시 종료

        let frameSize = 0
        if (isV22) {
          frameSize = (view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5)
        } else if (majorVersion === 4) {
          frameSize = ((view.getUint8(offset + 4) & 0x7f) << 21) |
            ((view.getUint8(offset + 5) & 0x7f) << 14) |
            ((view.getUint8(offset + 6) & 0x7f) << 7) |
            (view.getUint8(offset + 7) & 0x7f)
        } else { // v2.3
          frameSize = view.getUint32(offset + 4)
        }

        if (frameSize <= 0 || offset + headerLen + frameSize > buffer.byteLength) break

        const frameData = new Uint8Array(buffer, offset + headerLen, frameSize)

        // 1. 곡 제목 (TIT2 / TT2)
        if (frameId === 'TIT2' || frameId === 'TT2') {
          title = decodeFrameText(frameData)
        }

        // 2. 아티스트 (TPE1 / TP1)
        if (frameId === 'TPE1' || frameId === 'TP1') {
          artist = decodeFrameText(frameData)
        }

        // 3. 썸네일 이미지 (APIC / PIC)
        if (frameId === 'APIC' || frameId === 'PIC') {
          try {
            let p = 1 // encoding byte skip
            let imageMimeType: 'image/jpeg' | 'image/png' | undefined
            if (frameId === 'PIC') {
              const imageFormat = String.fromCharCode(...frameData.subarray(p, p + 3))
              if (imageFormat === 'PNG') imageMimeType = 'image/png'
              if (imageFormat === 'JPG') imageMimeType = 'image/jpeg'
              p += 3 // skip fixed image format
            } else {
              // MIME Type 읽기
              while (p < frameData.length && frameData[p] !== 0) p++
              p++ // skip NULL
            }
            p++ // skip picture type byte

            // Description 읽기 (인코딩에 따라 NULL 스킵)
            while (p < frameData.length && frameData[p] !== 0) p++
            p++
            if (frameData[0] === 1 || frameData[0] === 2) p++ // UTF-16 2byte NULL 스킵

            // 이미지 바이너리 시작 지점 찾기 (JPEG: 0xFF 0xD8 / PNG: 0x89 0x50)
            while (p < frameData.length - 1) {
              if (frameData[p] === 0xff && frameData[p + 1] === 0xd8) {
                imageMimeType = 'image/jpeg'
                break
              }
              if (frameData[p] === 0x89 && frameData[p + 1] === 0x50) {
                imageMimeType = 'image/png'
                break
              }
              p++
            }

            if (p < frameData.length && imageMimeType) {
              const imgBuffer = frameData.subarray(p)
              const blob = new Blob([imgBuffer], { type: imageMimeType })
              coverUrl = URL.createObjectURL(blob)
            }
          } catch { }
        }

        offset += headerLen + frameSize
      }

      resolve({ title: title || fallbackTitle, artist: artist || fallbackArtist, coverUrl })
    }

    reader.onerror = () => resolve({ title: fallbackTitle, artist: fallbackArtist })
    // ID3 헤더 및 썸네일 데이터까지 고려하여 2MB 읽기
    reader.readAsArrayBuffer(file.slice(0, 2 * 1024 * 1024))
  })
}
