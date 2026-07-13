const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const supportsIO = typeof window !== 'undefined' && 'IntersectionObserver' in window

/**
 * v-reveal — scroll-driven entry animation (fade-up + blur resolve).
 * Motivated by: storytelling (content reveals in reading order as it enters).
 *
 * Implemented with IntersectionObserver (not ScrollTrigger) on purpose:
 * sections that mount late from async data (categories, auth-gated CTA) or shift
 * position as images above them load used to leave stale trigger positions, which
 * left the element stuck at opacity:0 forever. IO re-evaluates against the live
 * layout, fires immediately for anything already on screen, and a failsafe timer
 * guarantees the element can never remain invisible.
 *
 * Usage:
 *   v-reveal                      → default
 *   v-reveal="{ delay: 0.1, y: 32 }"
 */
export const reveal = {
  mounted(el, binding) {
    if (prefersReduced()) return

    const { delay = 0, y = 24 } = binding.value || {}

    const show = () => {
      if (el._revealed) return
      el._revealed = true
      el.style.transitionDelay = `${delay}s`
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        el.style.filter = 'blur(0px)'
      })
      el._revealCleanup?.()
      window.setTimeout(() => {
        // drop the filter once settled so text stays crisp
        el.style.filter = ''
      }, 900 + delay * 1000)
    }

    el.style.opacity = '0'
    el.style.transform = `translateY(${y}px)`
    el.style.filter = 'blur(6px)'
    el.style.willChange = 'opacity, transform'
    el.style.transition =
      'opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1), filter 0.85s cubic-bezier(0.16,1,0.3,1)'

    if (!supportsIO) {
      show()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) show()
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
    )
    io.observe(el)

    // Failsafe: never let content stay hidden if IO misfires on an offscreen/edge case.
    const failsafe = window.setTimeout(show, 2500)

    el._revealCleanup = () => {
      io.disconnect()
      window.clearTimeout(failsafe)
      el.style.willChange = ''
    }
  },

  unmounted(el) {
    el._revealCleanup?.()
    delete el._revealCleanup
    delete el._revealed
  },
}

export default reveal
