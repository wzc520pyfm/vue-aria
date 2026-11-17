import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {I18nProvider} from '../../i18n/I18nProvider'
import {useProgressBar, type ProgressBarAria} from '../useProgressBar'
import {useMeter, type MeterAria} from '../../meter/useMeter'

function mountProgress(props: Record<string, any> = {}) {
  let aria!: ProgressBarAria
  const wrapper = mount(defineComponent({
    setup() {
      aria = useProgressBar(props)
      return () => h('div')
    },
  }))
  return {aria, wrapper}
}

function mountInLocale(locale: {value: string}, props: Record<string, any>) {
  let aria!: ProgressBarAria
  const wrapper = mount(defineComponent({
    setup() {
      return () => h(I18nProvider, {locale: locale.value}, {
        default: () => h(defineComponent({
          setup() {
            aria = useProgressBar(props)
            return () => h('div')
          },
        })),
      })
    },
  }))
  return {aria, wrapper}
}

describe('useProgressBar', () => {
  it('uses 0, 0, and 100 and formats the zero percent label', () => {
    const {aria, wrapper} = mountProgress({'aria-label': 'Loading'})
    expect(isRef(aria.progressBarProps)).toBe(false)
    expect(isRef(aria.labelProps)).toBe(false)
    expect(aria.progressBarProps.role).toBe('progressbar')
    expect(aria.progressBarProps['aria-valuemin']).toBe(0)
    expect(aria.progressBarProps['aria-valuemax']).toBe(100)
    expect(aria.progressBarProps['aria-valuenow']).toBe(0)
    expect(aria.progressBarProps['aria-valuetext']).toBe('0%')
    expect(aria.progressBarProps.label).toBeUndefined()
    expect(aria.progressBarProps.value).toBeUndefined()
    expect(aria.progressBarProps.isIndeterminate).toBeUndefined()
    wrapper.unmount()
  })

  it('clamps the value and formats a percent from the normalized ratio', () => {
    const value = ref(25)
    const minValue = ref(0)
    const maxValue = ref(200)
    const {aria, wrapper} = mountProgress({
      value: () => value.value,
      minValue,
      maxValue,
      'aria-label': 'Loading',
    })
    expect(aria.progressBarProps['aria-valuenow']).toBe(25)
    expect(aria.progressBarProps['aria-valuetext']).toBe('13%')
    value.value = 250
    expect(aria.progressBarProps['aria-valuenow']).toBe(200)
    expect(aria.progressBarProps['aria-valuetext']).toBe('100%')
    value.value = -10
    expect(aria.progressBarProps['aria-valuenow']).toBe(0)
    expect(aria.progressBarProps['aria-valuetext']).toBe('0%')
    maxValue.value = 0
    minValue.value = 0
    value.value = 5
    expect(aria.progressBarProps['aria-valuenow']).toBe(0)
    expect(aria.progressBarProps['aria-valuemin']).toBe(0)
    expect(aria.progressBarProps['aria-valuemax']).toBe(0)
    expect(aria.progressBarProps['aria-valuetext']).toBe('0%')
    wrapper.unmount()
  })

  it('formats a non-percent value from the actual number', () => {
    const formatOptions = ref<Intl.NumberFormatOptions | undefined>({style: 'decimal'})
    const {aria, wrapper} = mountProgress({
      value: 1500,
      maxValue: 2000,
      formatOptions: () => formatOptions.value,
      'aria-label': 'Bytes',
    })
    expect(aria.progressBarProps['aria-valuenow']).toBe(1500)
    expect(aria.progressBarProps['aria-valuetext']).toBe(new Intl.NumberFormat('en-US', {style: 'decimal'}).format(1500))
    formatOptions.value = {style: 'currency', currency: 'USD'}
    expect(aria.progressBarProps['aria-valuetext']).toBe(new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(1500))
    formatOptions.value = undefined
    expect(aria.progressBarProps['aria-valuetext']).toBe('75%')
    wrapper.unmount()
  })

  it('prefers a truthy valueLabel and falls back when the label is falsy', () => {
    const valueLabel = ref<unknown>('1 of 4')
    const {aria, wrapper} = mountProgress({
      value: 25,
      valueLabel: () => valueLabel.value,
      'aria-label': 'Steps',
    })
    expect(aria.progressBarProps['aria-valuenow']).toBe(25)
    expect(aria.progressBarProps['aria-valuetext']).toBe('1 of 4')
    valueLabel.value = '0'
    expect(aria.progressBarProps['aria-valuetext']).toBe('0')
    for (const falsy of ['', 0, false, null, undefined]) {
      valueLabel.value = falsy
      expect(aria.progressBarProps['aria-valuetext']).toBe('25%')
    }
    wrapper.unmount()
  })

  it('omits the current value and value text while indeterminate, then restores them', () => {
    const indeterminate = ref(true)
    const {aria, wrapper} = mountProgress({
      value: 25,
      valueLabel: '1 of 4',
      isIndeterminate: () => indeterminate.value,
      'aria-label': 'Loading',
    })
    expect(aria.progressBarProps.role).toBe('progressbar')
    expect(aria.progressBarProps['aria-valuemin']).toBe(0)
    expect(aria.progressBarProps['aria-valuemax']).toBe(100)
    expect(aria.progressBarProps['aria-valuenow']).toBeUndefined()
    expect(aria.progressBarProps['aria-valuetext']).toBeUndefined()
    expect('aria-valuenow' in aria.progressBarProps).toBe(true)
    indeterminate.value = false
    expect(aria.progressBarProps['aria-valuenow']).toBe(25)
    expect(aria.progressBarProps['aria-valuetext']).toBe('1 of 4')
    indeterminate.value = true
    expect(aria.progressBarProps['aria-valuenow']).toBeUndefined()
    expect(aria.progressBarProps['aria-valuetext']).toBeUndefined()
    wrapper.unmount()
  })

  it('points aria-labelledby at the span label and keeps describedby live', () => {
    const described = ref('hint')
    const {aria, wrapper} = mountProgress({
      label: 'Loading',
      'aria-describedby': () => described.value,
      'data-foo': 'bar',
    })
    expect(aria.labelProps.id).toBeTruthy()
    expect(aria.labelProps.htmlFor).toBeUndefined()
    expect(aria.progressBarProps['aria-labelledby']).toBe(aria.labelProps.id)
    expect(aria.progressBarProps['aria-describedby']).toBe('hint')
    expect(aria.progressBarProps['data-foo']).toBe('bar')
    described.value = 'next'
    expect(aria.progressBarProps['aria-describedby']).toBe('next')
    const first = aria.progressBarProps
    expect(aria.progressBarProps).toBe(first)
    wrapper.unmount()
  })

  it('follows the locale on the live value text', async () => {
    const locale = ref('en-US')
    const {aria, wrapper} = mountInLocale(locale, {value: 25, 'aria-label': 'Loading'})
    expect(aria.progressBarProps['aria-valuetext']).toBe(new Intl.NumberFormat('en-US', {style: 'percent'}).format(0.25))
    locale.value = 'de-DE'
    await nextTick()
    expect(aria.progressBarProps['aria-valuetext']).toBe(new Intl.NumberFormat('de-DE', {style: 'percent'}).format(0.25))
    wrapper.unmount()
  })
})

describe('useMeter', () => {
  function mountMeter(props: Record<string, any> = {}) {
    let meter!: MeterAria
    let progress!: ProgressBarAria
    const wrapper = mount(defineComponent({
      setup() {
        progress = useProgressBar(props)
        meter = useMeter(props)
        return () => h('div')
      },
    }))
    return {meter, progress, wrapper}
  }

  it('keeps the progress getters and overrides only the role', () => {
    const value = ref(25)
    const {meter, wrapper} = mountMeter({value: () => value.value, 'aria-label': 'Storage'})
    expect(isRef(meter.meterProps)).toBe(false)
    expect(meter.meterProps.role).toBe('meter')
    expect(meter.meterProps['aria-valuenow']).toBe(25)
    expect(meter.meterProps['aria-valuetext']).toBe('25%')
    expect(meter.labelProps.htmlFor).toBeUndefined()
    const snapshot = {...meter.meterProps}
    value.value = 40
    expect(snapshot['aria-valuenow']).toBe(25)
    expect(meter.meterProps['aria-valuenow']).toBe(40)
    expect(meter.meterProps['aria-valuetext']).toBe('40%')
    expect(meter.meterProps.role).toBe('meter')
    wrapper.unmount()
  })

  it('still omits the current value when indeterminate is passed through', () => {
    const {meter, wrapper} = mountMeter({value: 25, isIndeterminate: true, 'aria-label': 'Storage'})
    expect(meter.meterProps.role).toBe('meter')
    expect(meter.meterProps['aria-valuemin']).toBe(0)
    expect(meter.meterProps['aria-valuemax']).toBe(100)
    expect(meter.meterProps['aria-valuenow']).toBeUndefined()
    expect(meter.meterProps['aria-valuetext']).toBeUndefined()
    wrapper.unmount()
  })
})
