<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData, useRouter } from 'vitepress'

const { page } = useData()
const router = useRouter()

const rel = computed(() => page.value.relativePath)
const isArchive = computed(() => rel.value.startsWith('14.6/'))
const isJa = computed(() => rel.value.startsWith('ja/') || rel.value.startsWith('14.6/ja/'))

const currentVersion = computed(() => (isArchive.value ? '14.6' : '20.0'))

// The current stable (20.0) is unversioned at the root; older versions live
// under their own directories. Switching jumps to that version's home.
const latestLink = computed(() => (isJa.value ? '/ja/' : '/'))
const v14Link = computed(() => (isJa.value ? '/14.6/ja/' : '/14.6/'))

const open = ref(false)

function navigate(url: string) {
  open.value = false
  router.go(url)
}
</script>

<template>
  <div class="VPVersionSwitcher" @mouseenter="open = true" @mouseleave="open = false">
    <button class="version-button" :aria-expanded="open">
      {{ currentVersion }}
      <span class="vpi-chevron-down" />
    </button>
    <div v-if="open" class="version-menu">
      <a
        class="version-item"
        :class="{ active: !isArchive }"
        :href="latestLink"
        @click.prevent="navigate(latestLink)"
      >20.0</a>
      <a
        class="version-item"
        :class="{ active: isArchive }"
        :href="v14Link"
        @click.prevent="navigate(v14Link)"
      >14.6</a>
    </div>
  </div>
</template>
