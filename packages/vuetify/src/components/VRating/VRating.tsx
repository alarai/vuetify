// Styles
import './VRating.sass'

// Components
import { VBtn } from '../VBtn'

// Composables
import { makeDensityProps } from '@/composables/density'
import { makeSizeProps } from '@/composables/size'
import { makeTagProps } from '@/composables/tag'
import { useProxiedModel } from '@/composables/proxiedModel'
import { makeThemeProps, useTheme } from '@/composables/theme'
import { useLocale } from '@/composables/locale'

// Utilities
import { computed, defineComponent, ref } from 'vue'
import { createRange, getUid, makeProps } from '@/util'

// Types
import type { Prop } from 'vue'

export default defineComponent({
  name: 'VRating',

  props: makeProps({
    name: String,
    itemAriaLabel: {
      type: String,
      default: '$vuetify.rating.ariaLabel.item',
    },
    bgColor: String,
    color: String,
    clearable: Boolean,
    disabled: Boolean,
    emptyIcon: {
      type: String,
      default: '$ratingEmpty',
    },
    fullIcon: {
      type: String,
      default: '$ratingFull',
    },
    halfIncrements: Boolean,
    hover: Boolean,
    length: {
      type: [Number, String],
      default: 5,
    },
    readonly: Boolean,
    modelValue: {
      type: Number,
      default: 0,
    },
    itemLabels: Array as Prop<string[]>,
    itemLabelPosition: {
      type: String,
      default: 'top',
      validator: (v: any) => ['top', 'bottom'].includes(v),
    },
    ripple: Boolean,

    ...makeDensityProps(),
    ...makeSizeProps(),
    ...makeTagProps(),
    ...makeThemeProps(),
  }),

  emits: {
    'update:modelValue': (value: number) => true,
  },

  setup (props, { slots }) {
    const { t } = useLocale()
    const { themeClasses } = useTheme(props)
    const rating = useProxiedModel(props, 'modelValue')

    const range = computed(() => createRange(Number(props.length), 1))
    const increments = computed(() => range.value.flatMap(v => props.halfIncrements ? [v - 0.5, v] : [v]))
    const hoverIndex = ref(-1)
    const focusIndex = ref(-1)
    const firstRef = ref<HTMLElement>()
    let isClicking = false

    const itemState = computed(() => increments.value.map(value => {
      const isHovering = props.hover && hoverIndex.value > -1
      const isFilled = rating.value >= value
      const isHovered = hoverIndex.value >= value
      const isFullIcon = isHovering ? isHovered : isFilled
      const icon = isFullIcon ? props.fullIcon : props.emptyIcon
      const color = isFilled || isHovered ? props.color : props.bgColor

      return { isFilled, isHovered, icon, color }
    }))

    const eventState = computed(() => [0, ...increments.value].map(value => {
      function onMouseenter () {
        hoverIndex.value = value
      }

      function onMouseleave () {
        hoverIndex.value = -1
      }

      function onFocus () {
        if (value === 0 && rating.value === 0) {
          firstRef.value?.focus()
        } else {
          focusIndex.value = value
        }
      }

      function onBlur () {
        if (!isClicking) focusIndex.value = -1
      }

      function onClick () {
        if (props.disabled || props.readonly) return
        rating.value = rating.value === value && props.clearable ? 0 : value
      }

      return {
        onMouseenter: props.hover ? onMouseenter : undefined,
        onMouseleave: props.hover ? onMouseleave : undefined,
        onFocus,
        onBlur,
        onClick,
      }
    }))

    function onMousedown () {
      isClicking = true
    }

    function onMouseup () {
      isClicking = false
    }

    const name = computed(() => props.name ?? `v-rating-${getUid()}`)

    function VRatingItem ({ value, index, showStar = true }: { value: number, index: number, showStar?: boolean }) {
      const { onMouseenter, onMouseleave, onFocus, onBlur, onClick } = eventState.value[index + 1]
      const id = `${name.value}-${String(value).replace('.', '-')}`

      return (
        <>
          <label
            for={ id }
            class={{
              'v-rating__item--half': props.halfIncrements && value % 1 > 0,
              'v-rating__item--full': props.halfIncrements && value % 1 === 0,
            }}
            onMousedown={ onMousedown }
            onMouseup={ onMouseup }
          >
            <span class="v-rating__hidden">{ t(props.itemAriaLabel, value, props.length) }</span>
            {
              !showStar ? undefined
              : slots.item ? slots.item({
                ...itemState.value,
                value,
                index,
                size: props.size,
                ripple: props.ripple,
                density: props.density,
                onMouseenter,
                onMouseleave,
              })
              : (
                <VBtn
                  tag="span"
                  color={ itemState.value[index].color }
                  density={ props.density }
                  icon={ itemState.value[index].icon }
                  size={ props.size }
                  variant="text"
                  onMouseenter={ onMouseenter }
                  onMouseleave={ onMouseleave }
                />
              )
            }
          </label>
          <input
            class="v-rating__hidden"
            name={ name.value }
            id={ id }
            type="radio"
            value={ value }
            checked={ rating.value === value }
            onClick={ onClick }
            onFocus={ onFocus }
            onBlur={ onBlur }
            ref={ index === 0 ? firstRef : undefined }
            readonly={ props.readonly }
            disabled={ props.disabled }
          />
        </>
      )
    }

    return () => {
      const hasLabels = !!props.itemLabels?.length

      return (
        <props.tag
          class={[
            'v-rating',
            {
              'v-rating--readonly': props.readonly,
            },
            themeClasses.value,
          ]}
        >
          <VRatingItem value={ 0 } index={ -1 } showStar={ false } />

          { range.value.map((value, i) => (
            <div class="v-rating__wrapper">
              {
                !hasLabels ? undefined
                : slots['item-label'] ? slots['item-label']()
                : props.itemLabels?.[i] ? <span>{ props.itemLabels?.[i] }</span>
                : <span>&nbsp;</span>
              }
              <div
                class={[
                  'v-rating__item',
                  {
                    'v-rating__item--focused': Math.ceil(focusIndex.value) === value,
                  },
                ]}
              >
                { props.halfIncrements ? (
                  <>
                    <VRatingItem value={ value - 0.5 } index={ i * 2 } />
                    <VRatingItem value={ value } index={ (i * 2) + 1 } />
                  </>
                ) : (
                  <VRatingItem value={ value } index={ i } />
                ) }
              </div>
            </div>
          )) }
        </props.tag>
      )
    }
  },
})
