<template>
  <div class="relative w-full">
    <!-- Skeleton while products load -->
    <div v-if="!products.length" class="mx-auto aspect-[4/5] w-[190px] animate-pulse rounded-[1.4rem] bg-steel-200" />

    <!-- Reduced-motion fallback: static grid, no 3D / no float / no drag -->
    <div v-else-if="reduced" class="mx-auto grid max-w-md grid-cols-2 gap-4">
      <HeroRingCard v-for="p in products" :key="p.id" :product="p" />
    </div>

    <!-- 3D poker-card ring -->
    <div v-else>
      <div
        ref="scene"
        class="relative mx-auto h-[400px] w-full max-w-md touch-pan-y select-none sm:h-[440px]"
        role="group"
        aria-roledescription="carousel"
        aria-label="精選商品，可拖曳旋轉"
      >
        <div
          v-for="(p, i) in products"
          :key="p.id"
          class="ring-card absolute left-1/2 top-1/2"
          @mouseenter="onCardEnter(i)"
          @mouseleave="onCardLeave(i)"
        >
          <div class="card-bob">
            <div class="card-zoom">
              <HeroRingCard :product="p" />
            </div>
          </div>
        </div>
      </div>

      <!-- Position indicator -->
      <div class="mt-3 flex items-center justify-center gap-1.5">
        <span
          v-for="(p, i) in products"
          :key="p.id"
          class="h-1.5 rounded-full transition-all duration-300"
          :class="i === activeIndex ? 'w-5 bg-brand-500' : 'w-1.5 bg-steel-300'"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted, ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import HeroRingCard from './HeroRingCard.vue'

gsap.registerPlugin(Draggable, InertiaPlugin)

const props = defineProps({
  products: { type: Array, default: () => [] },
})

const reduced = ref(
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const scene = ref(null)
const activeIndex = ref(0)

const DEG2RAD = Math.PI / 180
const DEG_PER_PX = 0.55        // drag sensitivity
let STEP = 90                  // degrees between cards (360 / N)
let SNAP_PX = STEP / DEG_PER_PX
let RADIUS_X = 140             // horizontal spread (recomputed to container)
const RADIUS_Y = 34            // vertical tilt (front lower, back higher)

let ctx                        // gsap.context for cleanup
let draggable
let ro                         // ResizeObserver
let io                         // IntersectionObserver — pause GPU work when off-screen
let cards = []                 // .ring-card elements
let bobTweens = []             // per-card up/down float tweens (paused on hover)
let rotation = 0               // current ring rotation, degrees
let proxy                      // detached element Draggable drives via type:"x"
let autoCall                   // gsap.delayedCall handle for autoplay
let hovering = false
const AUTO_INTERVAL = 3.4      // seconds each card is shown
const AUTO_RESUME = 5          // idle before autoplay resumes after interaction

function layout() {
  const n = cards.length
  if (!n) return
  for (let i = 0; i < n; i++) {
    const a = (i * STEP + rotation) * DEG2RAD
    const sin = Math.sin(a)
    const cos = Math.cos(a)
    const depth = (cos + 1) / 2            // 0 = back, 1 = front
    gsap.set(cards[i], {
      x: sin * RADIUS_X,
      y: cos * RADIUS_Y,
      scale: 0.66 + depth * 0.34,          // front = 1.0 exactly, never upscaled → stays sharp
      rotation: sin * 10,                  // subtle turn, never edge-on
      opacity: 0.4 + depth * 0.6,          // depth via scale + opacity (no blur filter → no softening)
      zIndex: Math.round(depth * 100),
      pointerEvents: depth > 0.85 ? 'auto' : 'none',  // only the front card is hoverable / clickable
    })
  }
}

function syncActive() {
  const n = cards.length
  if (!n) return
  activeIndex.value = ((Math.round(-rotation / STEP) % n) + n) % n
}

function fromProxy() {
  rotation = gsap.getProperty(proxy, 'x') * DEG_PER_PX
  layout()
  syncActive()
}

// Autoplay: slowly advance one card at a time; pauses on hover / drag
function scheduleAuto(delay = AUTO_INTERVAL) {
  if (reduced.value || !proxy || hovering) return
  autoCall?.kill()
  autoCall = gsap.delayedCall(delay, autoAdvance)
}
function stopAuto() {
  autoCall?.kill(); autoCall = null
}
function autoAdvance() {
  if (!proxy) return
  const targetX = (Math.round(gsap.getProperty(proxy, 'x') / SNAP_PX) - 1) * SNAP_PX
  gsap.to(proxy, {
    x: targetX,
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: fromProxy,
    onComplete: () => { draggable && draggable.update(); scheduleAuto() },
  })
}
// Only the front card reacts: it stops floating while hovered (others keep floating)
function onCardEnter(i) {
  if (i !== activeIndex.value) return
  hovering = true
  stopAuto()
  bobTweens[i]?.pause()
}
function onCardLeave(i) {
  if (i !== activeIndex.value) return
  hovering = false
  bobTweens[i]?.resume()
  scheduleAuto()
}

function computeRadius() {
  const w = scene.value?.clientWidth || 400
  RADIUS_X = Math.min(168, Math.max(110, w * 0.36))
}

function init() {
  destroy()                              // idempotent: never stack two inits
  if (reduced.value || !scene.value || !props.products.length) return
  const n = props.products.length
  STEP = 360 / n
  SNAP_PX = STEP / DEG_PER_PX

  ctx = gsap.context(() => {
    cards = gsap.utils.toArray(scene.value.querySelectorAll('.ring-card'))
    gsap.set(cards, { xPercent: -50, yPercent: -50 })
    computeRadius()
    layout()

    // Idle up/down float on each card's inner wrapper (independent of ring transform)
    bobTweens = cards.map((el, i) => {
      const inner = el.querySelector('.card-bob')
      return gsap.to(inner, {
        y: -12,
        duration: 2.2 + i * 0.25,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.4,
      })
    })

    // detached proxy element drives rotation; scene receives the pointer events (trigger)
    proxy = document.createElement('div')
    draggable = Draggable.create(proxy, {
      type: 'x',
      trigger: scene.value,
      inertia: true,
      dragClickables: true,
      minimumMovement: 6,
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress() { stopAuto(); gsap.killTweensOf(proxy) },
      onDrag: fromProxy,
      onThrowUpdate: fromProxy,
      onThrowComplete() { syncActive(); scheduleAuto(AUTO_RESUME) },
      snap: { x: (x) => Math.round(x / SNAP_PX) * SNAP_PX },
    })[0]

    scheduleAuto()
  }, scene.value)

  ro = new ResizeObserver(() => { computeRadius(); layout() })
  ro.observe(scene.value)

  // Pause the endless float + autoplay while the hero is scrolled out of view,
  // so mobile GPUs aren't burning frames on an invisible ring.
  io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        bobTweens.forEach((t) => t.resume())
        scheduleAuto(AUTO_RESUME)
      } else {
        bobTweens.forEach((t) => t.pause())
        stopAuto()
      }
    },
    { threshold: 0.01 }
  )
  io.observe(scene.value)
}

function destroy() {
  stopAuto()
  io?.disconnect(); io = null
  ro?.disconnect(); ro = null
  draggable?.kill(); draggable = null
  ctx?.revert(); ctx = null
  cards = []; bobTweens = []
}

// Re-init whenever the rendered product set changes (mount, async load, or the
// store swapping in a fresh array on every Home visit). Watching only .length
// misses same-length swaps → stale card refs → overlapped, non-rotating cards.
watch(
  () => props.products.map((p) => p.id).join(','),
  async () => {
    if (reduced.value) return
    destroy()
    if (props.products.length) { await nextTick(); init() }
  },
  { immediate: true }
)

onUnmounted(destroy)
</script>

<style scoped>
/* Hover zoom lives on an element without will-change, so it re-rasterizes
   sharp at rest (no GPU upscale blur). */
.card-zoom {
  transform-origin: center;
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.ring-card:hover .card-zoom {
  transform: scale(1.06);
}
@media (prefers-reduced-motion: reduce) {
  .card-zoom { transition: none; }
  .ring-card:hover .card-zoom { transform: none; }
}
</style>
