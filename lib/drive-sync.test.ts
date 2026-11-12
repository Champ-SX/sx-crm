import { describe, it, expect } from 'vitest'
import { planSync, matchKey, roleOf, driveFolderId, type DriveEntry } from './drive-sync'

// Real listing of the A62 Elevator room folder (12 Nov 2026).
const A62: DriveEntry[] = [
  { id: '1kWY-U7pkfhjq7hEGbcShRbdTE72-Xta3', name: '.Ai', folder: true, path: '' },
  { id: '19K2XEzB39pPSbQmzp4Yq0Fzgc0ozFRP6', name: 'Frame', folder: true, path: '' },
  { id: '10CSHBzwjUHVhf2I5qEM0SCGsvH2dAOE5', name: 'GIF', folder: true, path: '' },
  { id: '1aOmhWDawCPhbibv93VVgbazYO6Bsflmj', name: 'Preview', folder: true, path: '' },
  { id: '1si60r1_fTZIQm-KqNbEY_G4G4JAjlm9p', name: 'Elevator Room - Frame-01.png', folder: false, path: 'Frame' },
  { id: '1MAyHFQgEFqB6jFmwovG1t24gVo_FJjkL', name: 'Elevator Room - Frame-02.png', folder: false, path: 'Frame' },
  { id: '11CLLPVYNTuPytNC3QadhuEC0AAEjGMoQ', name: 'Elevator Room - Frame-03.png', folder: false, path: 'Frame' },
  { id: '1ndd-DZWQKA3If32_Gx-8jJ1VC_5grWo-', name: 'Elevator Room - Frame-04.png', folder: false, path: 'Frame' },
  { id: '1eS7xXJfrjBFO9FhblcYMN_GDKI0_H3aj', name: 'Elevator Room - Frame-04FIX.png', folder: false, path: 'Frame' },
  { id: '1hlajOnR8KAlLaQcozvGfyKc9ejN9t4qV', name: 'Elevator Room - Preview Frame-01.png', folder: false, path: 'Preview' },
  { id: '1217_OjoKnWGPQ4ykS9F7_WVW2ZPU14Ua', name: 'Elevator Room - Preview Frame-02.png', folder: false, path: 'Preview' },
  { id: '1i_G6nLc0A7x9RTBiP1MjzaPJeQOoX8Es', name: 'Elevator Room - Preview Frame-03.png', folder: false, path: 'Preview' },
  { id: '1bFyA7wi45gXtLQkPg65HfvysEu-bwmqJ', name: 'Elevator Room - Preview Frame-04.png', folder: false, path: 'Preview' },
  { id: '13EMGEQt1cNs48vEi9kExGklZdFoSwBw4', name: 'Elevator Room - Frame.ai', folder: false, path: '.Ai' },
  { id: '17DrTZfmPd1Aq3NBZSd4sOlSe6fT_qpwv', name: 'gude-2026-04-30.log', folder: false, path: '.Ai' },
]
const place = { branch: 'BACC', room: 'A62' }

describe('drive sync', () => {
  it('reads folder ids from both link styles', () => {
    expect(driveFolderId('https://drive.google.com/open?id=11AujGCRnzMvf9HtKi9W32XhBFkkarMoC&usp=drive_fs')).toBe('11AujGCRnzMvf9HtKi9W32XhBFkkarMoC')
    expect(driveFolderId('https://drive.google.com/drive/folders/11AujGCRnzMvf9HtKi9W32XhBFkkarMoC?usp=x')).toBe('11AujGCRnzMvf9HtKi9W32XhBFkkarMoC')
  })
  it('pairs frames with previews and treats FIX as a newer version', () => {
    expect(matchKey('Elevator Room - Preview Frame-04.png')).toBe(matchKey('Elevator Room - Frame-04FIX.png'))
    const r = planSync(A62, [], place, 'Andy')
    const frames = r.assets.filter((a) => a.kind === 'frame')
    expect(frames).toHaveLength(4)
    expect(r.assets.filter((a) => a.kind === 'source')).toHaveLength(1)
    expect(r.skipped).toEqual(['gude-2026-04-30.log'])
    const f4 = frames.find((a) => a.name === 'Elevator Room · Frame-04')!
    expect(f4.settings.drive_id).toBe('1eS7xXJfrjBFO9FhblcYMN_GDKI0_H3aj')
    expect(f4.version).toBe(2)
    expect(f4.history[0].url).toContain('1ndd-DZWQKA3If32_Gx-8jJ1VC_5grWo-')
    expect(frames.every((a) => a.settings.preview_id)).toBe(true)
    expect(new Set(r.assets.map((a) => a.code)).size).toBe(r.assets.length)
    expect(roleOf(A62[4])).toBe('frame')
  })
  it('a second sync changes nothing; a new FIX bumps the version', () => {
    const first = planSync(A62, [], place, 'Andy').assets
    expect(planSync(A62, first, place, 'Andy')).toMatchObject({ added: 0, updated: 0, unchanged: 5 })
    const more = [...A62, { id: '1zzzzzzzzzzzzzzzzzzzzzzzzzzz', name: 'Elevator Room - Frame-02 FIX.png', folder: false, path: 'Frame' }]
    const r = planSync(more, first, place, 'Fine')
    expect(r.updated).toBe(1)
    expect(r.assets[0].version).toBe(2)
  })
})
