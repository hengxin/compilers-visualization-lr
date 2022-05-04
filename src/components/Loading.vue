<template>
    <div class="__g-loading-mask">
        <div class="__g-loading">
            <svg class="__g-loading-svg">
                <circle class="__g-loading-circle" cx="22" cy="22" r="20"></circle>
            </svg>
            <div class="__g-loading-text">
                <template v-if="Array.isArray(text)">
                    <div v-for="t in text">{{ t }}</div>
                </template>
                <div v-else>{{ text }}</div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
const props = defineProps<{ text: string | Array<string> }>();
</script>
<style>
.__g-loading-mask {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 30;
}

.__g-loading {
    position: absolute;
    top: calc(50% - 50px);
    width: 100%;
    text-align: center;
}

.__g-loading-svg {
    width: 44px;
    height: 44px;
    animation: loading-rotate 2s linear infinite;
}

.__g-loading-circle {
    stroke: var(--color-klein-blue);
    stroke-width: 2;
    fill: none;
    animation: loading-dash 1.5s ease-in-out infinite;
}

@keyframes loading-rotate {
    0% {
        transform: rotate(0);
    }

    100% {
        transform: rotate(360deg);
    }
}

@keyframes loading-dash {
    0% {
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
    }

    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -40px;
    }

    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -120px;
    }
}
</style>