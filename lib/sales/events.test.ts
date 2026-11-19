import { describe, expect, it } from 'vitest'
import { boothCodesIn, eventLabel, typeOf } from './machines'
import { dayRange, eventAt, eventsFromJobs, type WonJobLite } from './events'

const job = (p: Partial<WonJobLite>): WonJobLite => ({ job_id: p.job_number ?? 'x', job_number: null, event_date: null, event_end_date: null, product_name: null, event_display_name: null, venue: null, value_type: 'fixed', gp_share_pct: null, ...p })

describe('machine registry + Won titles', () => {
  it('maps numbers to booth types', () => {
    expect(typeOf(4)).toBe('space'); expect(typeOf(32)).toBe('event'); expect(typeOf(73)).toBe('store')
    expect(typeOf(44)).toBe('store'); expect(typeOf(101)).toBe('unassigned'); expect(typeOf(null)).toBe('unassigned')
  })
  it('reads booth codes from real titles', () => {
    expect(boothCodesIn('2026.12.06 - 089 - ตู้ถอดประกอบ K020, K032 - Event - Overcoat Festival 2026 @เขาค้อ').map((c) => c.no)).toEqual([20, 32])
    expect(boothCodesIn("2026.12.11 - 100 - What's in my bag  K035 - Event - Wedding @rin").map((c) => c.code)).toEqual(['K035'])
    expect(boothCodesIn('2026.12.23 - 155 - LCA IPAD L1 - Event - Barter')).toEqual([])          // 1-digit: not a booth
    expect(boothCodesIn('Tally T036 A3')).toEqual([{ no: 36, code: 'T036', known: false }])      // 36 is K036, not T
    expect(eventLabel('2026.12.24-25 - 126 - ตู้ถอดประกอบ K032 - Event - THE NUTCRACKER @SiamPIC Hall')).toBe('THE NUTCRACKER @SiamPIC Hall')
  })
  it('turns jobs into booth periods and flags conflicts', () => {
    const { events, checks } = eventsFromJobs([
      job({ job_number: '126', event_date: '2026-12-24', event_end_date: '2026-12-25', value_type: 'gp_share', gp_share_pct: 100,
        product_name: '2026.12.24-25 - 126 - ตู้ถอดประกอบ K032 - Event - Evan @SiamPIC Hall', event_display_name: '2026.12.24-25 - 126 - ตู้ถอดประกอบ K032 - Event - THE NUTCRACKER @SiamPIC Hall' }),
      job({ job_number: '137', event_date: '2026-11-20', event_end_date: '2026-11-21',
        product_name: '2026.11.20-21 - 137 - Tally K032 A3 - Event - คุณมุก @Central Pattaya', event_display_name: '2026.11.20-21 - 137 - Tally T036 A3 - Event - Onitsuka @Central Pattaya' }),
      job({ job_number: '156', event_date: '2026-11-24', product_name: '2026.12.23 - 156 - Topview K017 - Event - Zense', event_display_name: '2026.12.23 - 156 - Topview K017 - Event - Zense' }),
      job({ job_number: '155', event_date: '2026-12-23', product_name: '2026.12.23 - 155 - LCA IPAD L1 - Event - Barter' }),
      job({ job_number: 'OPS-06', event_date: '2026-10-30', product_name: 'เปลี่ยน CAPTURES.BOOTH @K06 neighbor', is_ops: true }),
    ])
    expect(events.map((e) => [e.job, e.booths, e.days, e.deal])).toEqual([['126', [32], 2, 'gp_share'], ['156', [17], 1, 'fixed'], ['137', [32], 2, 'fixed']])
    expect(events[0].label).toBe('THE NUTCRACKER @SiamPIC Hall')
    expect(checks.map((c) => c.job)).toEqual(['137', '156'])
    expect(eventAt(events, 32, '2026-12-25')?.job).toBe('126'); expect(eventAt(events, 32, '2026-12-26')).toBeUndefined()
  })
  it('flags a booth booked on two overlapping jobs', () => {
    const { checks } = eventsFromJobs([
      job({ job_number: '1', event_date: '2026-12-01', event_end_date: '2026-12-05', product_name: 'x - K035 - Event - A' }),
      job({ job_number: '2', event_date: '2026-12-04', product_name: 'x - K035 - Event - B' }),
    ])
    expect(checks.some((c) => /booked on both/.test(c.what))).toBe(true)
  })
  it('forecast range needs 5 days', () => {
    expect(dayRange([1, 2, 3, 4])).toBeNull()
    expect(dayRange([10, 20, 30, 40, 50])).toEqual({ lo: 20, mid: 30, hi: 40, n: 5 })
  })
})
