import React from "react"

export default function KeyEditor({
   editorKeyName,
   selectedKeyId,
   currentProfileName,
   currentLayerLabel,
   editorText,
   editorStatus,
   statusOptions,
   onTextChange,
   onStatusChange,
   onClearKey,
   descriptionRef,
}) {
   return (
      <aside className="editor">
         <header className="editor-header">
            <div>
               <div className="editor-title-main">
                  <span>{editorKeyName}</span>
                  <span className="key-code">{selectedKeyId || ""}</span>
               </div>
               <div className="editor-subtitle">
                  {selectedKeyId
                     ? "Edit what this key does on this layer in this profile."
                     : "Choose a key on the keyboard to start editing notes."}
               </div>
            </div>
            <div>
               <div className="pill">
                  {statusOptions.map(status => (
                     <span key={status.id} className="pill-item">
                        <span className="dot" data-status-dot={status.id} />
                        {status.label}
                     </span>
                  ))}
               </div>
            </div>
         </header>

         <div className="editor-body">
            <div className="field-row">
               <div className="field">
                  <label>Profile</label>
                  <input type="text" value={currentProfileName} readOnly />
               </div>
               <div className="field">
                  <label>Layer</label>
                  <input type="text" value={currentLayerLabel} readOnly />
               </div>
            </div>

            <div className="field">
               <label>Description</label>
               <textarea
                  ref={descriptionRef}
                  value={editorText}
                  onChange={e => onTextChange(e.target.value)}
                  placeholder="What does this key do in this layer?"
               />
               <small>Tip: first line appears on the key. Second line is shown smaller.</small>
            </div>

            <div className="field">
               <label>Status</label>
               <div className="status-badges">
                  {statusOptions.map(status => (
                     <button
                        key={status.id}
                        type="button"
                        className={
                           "status-chip" +
                           (editorStatus === status.id ? " status-chip-active" : "")
                        }
                        onClick={() => onStatusChange(status.id)}
                     >
                        <span className="dot" data-status-dot={status.id} />
                        {status.label}
                     </button>
                  ))}
                  <button type="button" className="btn clearKey-button" onClick={onClearKey}>Clear key</button>
               </div>
            </div>
         </div>
      </aside>
   )
}
