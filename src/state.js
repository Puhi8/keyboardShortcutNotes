export const LAYERS = [
   { id: "base", label: "Base" },
   { id: "shift", label: "Shift" },
   { id: "ctrl", label: "Ctrl" },
   { id: "alt", label: "Alt" },
   { id: "ctrlShift", label: "Ctrl+Shift" },
   { id: "altShift", label: "Alt+Shift" },
   { id: "ctrlAlt", label: "Ctrl+Alt" },
   { id: "ctrlAltShift", label: "Ctrl+Alt+Shift" }
]

export const STORAGE_KEY = "keyboardShortcutNotesReactProfiles"

export function createEmptyKeyData(layout) {
   const keyData = {}
   if (!Array.isArray(layout)) return keyData

   layout.forEach(row => {
      row.forEach(key => {
         if (!key || key.spacer || key.empty || !key.id) return
         if (!keyData[key.id]) {
            keyData[key.id] = { label: key.label, notes: {} }
         }
         LAYERS.forEach(layer => {
            if (!keyData[key.id].notes[layer.id]) {
               keyData[key.id].notes[layer.id] = { text: "", status: "free" }
            }
         })
      })
   })

   return keyData
}

export function ensureKeyDataStructure(source, layout) {
   const base = createEmptyKeyData(layout)
   if (!source) return base

   const merged = { ...base }

   Object.keys(source).forEach(keyId => {
      const srcKey = source[keyId] || {}
      const srcNotes = srcKey.notes || {}
      const existing = merged[keyId] || { label: srcKey.label || keyId, notes: {} }
      const notes = { ...(existing.notes || {}) }

      LAYERS.forEach(layer => {
         const src = srcNotes[layer.id] || notes[layer.id] || {}
         notes[layer.id] = { text: src.text || "", status: src.status || "free" }
      })
      merged[keyId] = { label: existing.label || srcKey.label || keyId, notes }
   })
   return merged
}

export function loadInitialState(defaultLayout, defaultLayoutName = "full") {
   const defaultKeyData = createEmptyKeyData(defaultLayout)
   let defaultProfiles = { default: { id: "default", name: "Default", keyData: defaultKeyData, layoutName: defaultLayoutName } }
   let currentProfileId = "default"
   let currentLayer = "base"
   if (typeof window === "undefined") return { profiles: defaultProfiles, currentProfileId, currentLayer }

   try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return { profiles: defaultProfiles, currentProfileId, currentLayer }
      const parsed = JSON.parse(raw)

      if (parsed.profiles) {
         const profiles = {}
         Object.keys(parsed.profiles).forEach(id => {
            const p = parsed.profiles[id]
            profiles[id] = {
               id,
               name: p.name || id,
               keyData: ensureKeyDataStructure(p.keyData, defaultLayout),
               layoutName: p.layoutName || defaultLayoutName
            }
         })

         const firstId = parsed.currentProfileId && profiles[parsed.currentProfileId]
            ? parsed.currentProfileId
            : Object.keys(profiles)[0] || "default"

         const layerValid = LAYERS.some(l => l.id === parsed.currentLayer)
         return {
            profiles,
            currentProfileId: firstId,
            currentLayer: layerValid ? parsed.currentLayer : "base"
         }
      }

      if (parsed.keyData) {
         defaultProfiles = {
            default: {
               id: "default",
               name: "Imported",
               keyData: ensureKeyDataStructure(parsed.keyData, defaultLayout),
               layoutName: parsed.layoutName || defaultLayoutName
            }
         }
         const layerValid = LAYERS.some(l => l.id === parsed.currentLayer)
         currentLayer = layerValid ? parsed.currentLayer : "base"
         return { profiles: defaultProfiles, currentProfileId, currentLayer }
      }
   }
   catch (e) { console.warn("Failed to load from localStorage", e) }
   return { profiles: defaultProfiles, currentProfileId, currentLayer }
}
