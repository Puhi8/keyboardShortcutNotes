import React, { useState, useEffect, useRef } from "react"
import keyboardLayout, { layoutOrder, miniKeyClassMap } from "./layout"
import { LAYERS, STORAGE_KEY, createEmptyKeyData, ensureKeyDataStructure, loadInitialState } from "./state"
import "./App.css"
import "./LayerPreview.css"
import Keyboard from "./components/Keyboard"
import KeyEditor from "./components/KeyEditor"
import LayerPreview from "./components/LayerPreview"

const LAYOUT_OPTIONS = (layoutOrder || Object.keys(keyboardLayout)).map(id => {
   const config = keyboardLayout[id]
   return { id, label: Array.isArray(config) ? id : config?.displayName || id }
}).filter(Boolean)

const STATUS_OPTIONS = [
   { id: "free", label: "Free" },
   { id: "used", label: "Used" },
   { id: "fixed", label: "Fixed" },
   { id: "other", label: "Other" }
]

export default function App() {
   const [currentLayoutName, setCurrentLayoutName] = useState("full")
   const layoutConfig = keyboardLayout[currentLayoutName] || { layout: [] }
   const layout = Array.isArray(layoutConfig) ? layoutConfig : layoutConfig.layout || []
   const [appState, setAppState] = useState(() => loadInitialState(layout))
   const [selectedKeyId, setSelectedKeyId] = useState(null)
   const [editorText, setEditorText] = useState("")
   const [editorStatus, setEditorStatus] = useState("free")
   const descriptionRef = useRef(null) // textarea focus handle
   const skipFirstSaveRef = useRef(true) // guard first save to avoid overwriting initial load
   const initialLayoutSyncedRef = useRef(false) // avoid layout sync loops
   const suppressAutoSaveRef = useRef(false) // skip auto-save when syncing UI from state
   const importInputRef = useRef(null)

   const { profiles, currentProfileId, currentLayer } = appState
   const currentProfile = profiles[currentProfileId]
   const keyDataState = currentProfile.keyData

   // ensure layout follows the profile preference on load/profile change
   useEffect(() => {
      if (initialLayoutSyncedRef.current) return
      const savedLayout = currentProfile.layoutName
      if (savedLayout && savedLayout !== currentLayoutName) setCurrentLayoutName(savedLayout)
      initialLayoutSyncedRef.current = true
   }, [currentProfile.layoutName])

   // Save to localStorage; skip the first run to avoid overwriting initial load
   useEffect(() => {
      if (skipFirstSaveRef.current) {
         skipFirstSaveRef.current = false
         return
      }
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)) }
      catch (e) { console.warn("Failed to save to localStorage", e) }
   }, [appState])


   // -----------------------------------------------------
   // EDITOR SYNC
   // -----------------------------------------------------

   const currentLayerLabel = LAYERS.find(l => l.id === currentLayer)?.label || currentLayer
   // Keep editor fields in sync with the selected key/layer
   useEffect(() => {
      if (!selectedKeyId) {
         setEditorText("")
         setEditorStatus("free")
         return
      }
      const data = keyDataState[selectedKeyId]
      if (!data) return

      const note = data.notes[currentLayer] || { text: "", status: "free" }
      if (note.text === editorText && note.status === editorStatus) return
      suppressAutoSaveRef.current = true
      setEditorText(note.text || "")
      setEditorStatus(note.status || "free")
   }, [selectedKeyId, currentLayer, keyDataState])

   // Auto-set status to "used" when typing into a free field
   const handleEditorTextChange = value => {
      setEditorText(value)
      if (editorStatus === "free" && value.trim().length > 0) setEditorStatus("used")
   }

   const handleSelectKey = (keyId, fallbackLabel) => {
      setSelectedKeyId(keyId)
      const data = keyDataState[keyId] || {
         label: fallbackLabel || keyId,
         notes: {}
      }
      const note = data.notes[currentLayer] || { text: "", status: "free" }
      setEditorText(note.text || "")
      setEditorStatus(note.status || "free")
      if (descriptionRef.current) descriptionRef.current.focus()
   }

   const updateCurrentProfileKeyData = (updater) => {
      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         const current = profilesCopy[prev.currentProfileId]
         const newKeyData = updater(current.keyData)
         profilesCopy[prev.currentProfileId] = {
            ...current,
            keyData: newKeyData
         }
         return { ...prev, profiles: profilesCopy }
      })
   }

   // Auto-save note changes
   useEffect(() => {
      if (suppressAutoSaveRef.current) {
         suppressAutoSaveRef.current = false
         return
      }
      if (!selectedKeyId) return
      const data = keyDataState[selectedKeyId] || { notes: {} }
      const existing = data.notes[currentLayer] || { text: "", status: "free" }
      if (existing.text === editorText && existing.status === editorStatus) return

      updateCurrentProfileKeyData((prevKeyData) => {
         const next = { ...prevKeyData }
         const keyEntry = next[selectedKeyId] || { label: selectedKeyId, notes: {} }
         const notes = { ...(keyEntry.notes || {}) }
         notes[currentLayer] = {
            text: editorText || "",
            status: editorStatus || "free"
         }
         next[selectedKeyId] = { ...keyEntry, notes }
         return next
      })
   }, [editorText, editorStatus, currentLayer, selectedKeyId]) // relies on updateCurrentProfileKeyData

   const handleClearKey = () => {
      if (!selectedKeyId) return

      updateCurrentProfileKeyData(prevKeyData => {
         const next = { ...prevKeyData }
         if (!next[selectedKeyId]) return prevKeyData
         next[selectedKeyId] = {
            ...next[selectedKeyId],
            notes: { ...next[selectedKeyId].notes }
         }
         next[selectedKeyId].notes[currentLayer] = {
            text: "",
            status: "free"
         }
         return next
      })
      setEditorText("")
      setEditorStatus("free")
   }

   const handleResetAll = () => {
      if (!window.confirm("Clear ALL notes for this profile?")) return
      const empty = createEmptyKeyData(layout)
      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         profilesCopy[prev.currentProfileId] = {
            ...profilesCopy[prev.currentProfileId],
            keyData: empty
         }
         return { ...prev, profiles: profilesCopy }
      })

      setSelectedKeyId(null)
      setEditorText("")
      setEditorStatus("free")
   }

   const handleExport = () => {
      const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json", })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "keyboard-shortcut-notes-profiles.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
   }

   const handleImport = (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = e => {
         try {
            const parsed = JSON.parse(e.target.result)
            if (!parsed.profiles && !parsed.keyData) throw new Error("Invalid file format.")
            if (parsed.profiles) {
               const profiles = {}
               Object.keys(parsed.profiles).forEach(id => {
                  const p = parsed.profiles[id]
                  profiles[id] = {
                     id,
                     name: p.name || id,
                     keyData: ensureKeyDataStructure(p.keyData, layout)
                  }
               })

               const firstId = parsed.currentProfileId && profiles[parsed.currentProfileId]
                  ? parsed.currentProfileId
                  : Object.keys(profiles)[0] || "default"
               const layerValid = LAYERS.some(l => l.id === parsed.currentLayer)
               setAppState({
                  profiles,
                  currentProfileId: firstId,
                  currentLayer: layerValid ? parsed.currentLayer : "base"
               })
            }
            else {
               const kd = ensureKeyDataStructure(parsed.keyData, layout)
               const profiles = {
                  imported: {
                     id: "imported",
                     name: "Imported",
                     keyData: kd
                  }
               }
               const layerValid = LAYERS.some(l => l.id === parsed.currentLayer)
               setAppState({
                  profiles,
                  currentProfileId: "imported",
                  currentLayer: layerValid ? parsed.currentLayer : "base"
               })
            }

            setSelectedKeyId(null)
            setEditorText("")
            setEditorStatus("free")
         }
         catch (err) { alert("Could not import file: " + err.message) }
         finally { event.target.value = "" }
      }

      reader.readAsText(file)
   }

   const handleChangeLayer = layerId => {
      setAppState(prev => ({
         ...prev,
         currentLayer: layerId
      }))
   }

   const handleChangeLayout = (layoutId) => {
      if (layoutId === currentLayoutName) return
      if (!window.confirm("Change keyboard layout for this profile? Notes will stay attached to matching key IDs.")) return

      const nextLayoutConfig = keyboardLayout[layoutId] || { layout: [] }
      const nextLayout = Array.isArray(nextLayoutConfig) ? nextLayoutConfig : nextLayoutConfig.layout || []

      setCurrentLayoutName(layoutId)
      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         const currentProfileData = profilesCopy[prev.currentProfileId]
         const mergedKeyData = ensureKeyDataStructure(currentProfileData.keyData, nextLayout)
         profilesCopy[prev.currentProfileId] = {
            ...currentProfileData,
            layoutName: layoutId,
            keyData: mergedKeyData
         }
         return { ...prev, profiles: profilesCopy }
      })
   }

   const handleChangeProfile = profileId => {
      setAppState(prev => {
         const nextLayoutName = prev.profiles[profileId]?.layoutName || currentLayoutName
         if (nextLayoutName !== currentLayoutName) setCurrentLayoutName(nextLayoutName)
         return {
            ...prev,
            currentProfileId: profileId
         }
      })
      setSelectedKeyId(null)
   }

   const handleNewProfile = () => {
      const name = window.prompt("New profile name?")
      if (!name) return
      const idBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profile"
      const id = `${idBase}-${Date.now().toString(36)}`
      const empty = createEmptyKeyData(layout)

      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         profilesCopy[id] = {
            id,
            name: name.trim(),
            keyData: empty,
            layoutName: currentLayoutName
         }
         return {
            ...prev,
            profiles: profilesCopy,
            currentProfileId: id
         }
      })

      setSelectedKeyId(null)
      setEditorText("")
      setEditorStatus("free")
   }

   const handleRenameProfile = () => {
      const current = profiles[currentProfileId]
      const newName = window.prompt("Rename profile:", current.name)
      if (!newName) return
      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         profilesCopy[prev.currentProfileId] = {
            ...profilesCopy[prev.currentProfileId],
            name: newName.trim()
         }
         return { ...prev, profiles: profilesCopy }
      })
   }

   const handleDeleteProfile = () => {
      if (Object.keys(profiles).length <= 1) {
         alert("You must have at least one profile.")
         return
      }
      const current = profiles[currentProfileId]
      if (!window.confirm(`Delete profile "${current.name}"?`)) return
      setAppState(prev => {
         const profilesCopy = { ...prev.profiles }
         delete profilesCopy[prev.currentProfileId]
         const remainingIds = Object.keys(profilesCopy)
         const newId = remainingIds[0]
         return {
            ...prev,
            profiles: profilesCopy,
            currentProfileId: newId
         }
      })
      setSelectedKeyId(null)
      setEditorText("")
      setEditorStatus("free")
   }

   const editorKeyName = selectedKeyId && keyDataState[selectedKeyId]
      ? keyDataState[selectedKeyId].label || selectedKeyId
      : "No key selected"

   return (
      <div className="app">
         <header className="app-header">
            <div className="title-group">
               <h1>Keyboard Shortcut Map</h1>
               <p>Click a key and write what it does on each layer.</p>
            </div>
            <div className="header-right">
               <div className="profile-bar">
                  <span className="profile-label">Profile</span>
                  <select
                     className="profile-select"
                     value={currentProfileId}
                     onChange={e => handleChangeProfile(e.target.value)}
                  >
                     {Object.values(profiles).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <button className="btn btn-ghost" onClick={handleNewProfile}>+ New</button>
                  <button className="btn btn-ghost" onClick={handleRenameProfile}>Rename</button>
                  <button className="btn btn-ghost" onClick={handleDeleteProfile}>Delete</button>
               </div>
               <div className="toolbar">
                  <button className="btn" onClick={handleExport} title="Export JSON">Export</button>
                  <button className="btn" onClick={() => importInputRef.current?.click()} title="Import JSON">Import</button>
                  <input
                     ref={importInputRef}
                     type="file"
                     accept="application/json"
                     className="file-input"
                     onChange={handleImport}
                     style={{ display: "none" }}
                  />
                  <button className="btn" onClick={handleResetAll} title="Clear all">Reset profile</button>
               </div>
            </div>
         </header>
         <main className="main">
            <div className="layer-bar">
               <span className="layer-label">Keyboard</span>
               <div className="layer-tabs compact">
                  {LAYOUT_OPTIONS.map(option => (
                     <button
                        key={option.id}
                        type="button"
                        className={"layer-tab" + (option.id === currentLayoutName ? " layer-tab-active" : "")}
                        onClick={() => handleChangeLayout(option.id)}
                     >{option.label}</button>
                  ))}
               </div>
               <span className="layer-label">Layers</span>
               <div className="layer-tabs">
                  {LAYERS.map(layer => (
                     <button
                        key={layer.id}
                        type="button"
                        className={"layer-tab" + (layer.id === currentLayer ? " layer-tab-active" : "")}
                        onClick={() => handleChangeLayer(layer.id)}
                     >{layer.label}</button>
                  ))}
               </div>
            </div>
            <div className="content">
               <section className="keyboard-wrap"><Keyboard
                  layout={layout}
                  keyDataState={keyDataState}
                  currentLayer={currentLayer}
                  onSelectKey={handleSelectKey}
               /></section>
               <KeyEditor
                  editorKeyName={editorKeyName}
                  selectedKeyId={selectedKeyId}
                  currentProfileName={currentProfile.name}
                  currentLayerLabel={currentLayerLabel}
                  editorText={editorText}
                  editorStatus={editorStatus}
                  statusOptions={STATUS_OPTIONS}
                  onTextChange={handleEditorTextChange}
                  onStatusChange={setEditorStatus}
                  onClearKey={handleClearKey}
                  descriptionRef={descriptionRef}
               />
               <LayerPreview
                  layout={layout}
                  keyDataState={keyDataState}
                  layers={LAYERS}
                  miniKeyClassMap={miniKeyClassMap}
               />
            </div>
         </main>
      </div>
   )
}
