import type { Ref } from 'vue-demi'
import { getCurrentInstance, inject, onMounted, provide, ref, watch } from 'vue-demi'
import delay from 'delay'
import noop from 'lodash/noop'
import { useVModel } from '@vueuse/core'
import { OverlayMetaKey } from './internal'

export interface UseOverlayMetaOptions {
  /** 动画时长，避免过早销毁组件 */
  animation?: number
  /** 是否立即将 visible 设为 true */
  immediate?: boolean
  /**
   * template 使用的 v-model 字段
   *
   * @default 'visible'
   */
  model?: string
}

/**
 * 获取弹出层元信息
 * @function cancel 调取失败，更改 visible，且当 animation 结束后销毁
 * @function confirm 调取成功，更改 visible，且当 animation 结束后销毁
 * @function vanish 销毁当前实例（立即调用，且会调用失败）
 * @field vnode 当前包装层的 VNode
 * @field visible 包装层属性，控制弹出层显示与隐藏
 * @returns
 */
export function useOverlayMeta(options: UseOverlayMetaOptions = {}) {
  const { animation = 0, immediate = true, model = 'visible' } = options
  const defaultMeta = getTemplateMeta(model)
  const meta = inject(OverlayMetaKey, defaultMeta) || defaultMeta

  // 为了简便性和合理的逻辑组合，将 animation 逻辑移至 meta 创建时
  // 组件式调用直接获取默认值，vanish 将没有任何效果，不进行 watch
  !meta.isTemplate
    && watch(meta.visible, async () => {
      if (meta.visible.value)
        return undefined
      if (animation > 0)
        await delay(animation)
      meta.vanish?.()
    })

  if (immediate)
    onMounted(() => (meta.visible.value = true))

  provide(OverlayMetaKey, null)
  return meta
}

export function getTemplateMeta(model: string) {
  const instance = getCurrentInstance()

  const visible = instance ? useVModel(instance.props, model) as Ref<boolean> : ref(false)

  const cancel = (value?: any) => {
    visible.value = false
    instance?.emit('cancel', value)
  }
  const confirm = (value?: any) => {
    visible.value = false
    instance?.emit('confirm', value)
  }
  return {
    cancel,
    confirm,
    vanish: noop,
    visible,
    isTemplate: true,
  }
}
