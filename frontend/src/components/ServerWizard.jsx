import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Server, HardDrive, Download, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/client.js';

export default function ServerWizard({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    memory: 1024,
    port: 25565,
    type: '',
    version: '',
    jarUrl: ''
  });

  const [typesData, setTypesData] = useState(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  
  const [versionsData, setVersionsData] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (step === 2 && !typesData) {
      setLoadingTypes(true);
      fetch('https://mcjars.app/api/v2/types')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setTypesData(data.types);
          } else {
            setError(data.errors?.[0] || 'Failed to load loaders');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoadingTypes(false));
    }

    if (step === 3 && form.type) {
      setLoadingVersions(true);
      fetch(`https://mcjars.app/api/v2/builds/${form.type}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            // Sort versions descending roughly
            const versions = Object.keys(data.builds).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
            setVersionsData({ list: versions, builds: data.builds });
            if (versions.length > 0) {
              setForm(f => ({ ...f, version: versions[0] }));
            }
          } else {
            setError(data.errors?.[0] || 'Failed to load versions');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoadingVersions(false));
    }
  }, [step, form.type]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const latestBuild = versionsData?.builds[form.version]?.latest;
      const jarUrl = latestBuild?.jarUrl || '';
      
      const payload = {
        name: form.name,
        type: form.type.toLowerCase(),
        version: form.version,
        port: form.port,
        memory: form.memory,
        jarUrl
      };

      const res = await api.post('/servers', payload);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !form.name) return setError('Server name is required');
    if (step === 1 && (!form.port || !form.memory)) return setError('Port and Memory are required');
    if (step === 2 && !form.type) return setError('Please select a loader type');
    if (step === 3 && !form.version) return setError('Please select a version');
    
    setError(null);
    setStep(s => s + 1);
  };

  const renderStepIcon = (num) => {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 14, 
        backgroundColor: step >= num ? '#3b82f6' : '#27272a',
        color: step >= num ? '#fff' : '#a1a1aa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 'bold'
      }}>
        {num}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal" style={{ width: 600, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Create Server Wizard</h2>
          {!loading && <button className="btn-icon" onClick={onClose}><X size={18} /></button>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          {renderStepIcon(1)}
          <span style={{ color: step >= 1 ? '#fff' : '#a1a1aa', fontSize: 14 }}>General</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#27272a' }} />
          {renderStepIcon(2)}
          <span style={{ color: step >= 2 ? '#fff' : '#a1a1aa', fontSize: 14 }}>Loader</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#27272a' }} />
          {renderStepIcon(3)}
          <span style={{ color: step >= 3 ? '#fff' : '#a1a1aa', fontSize: 14 }}>Version</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#27272a' }} />
          {renderStepIcon(4)}
          <span style={{ color: step >= 4 ? '#fff' : '#a1a1aa', fontSize: 14 }}>Review</span>
        </div>

        {error && (
          <div style={{ padding: 12, backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: 6, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Server Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. My Survival Server" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Memory (MB)</label>
                <input type="number" value={form.memory} onChange={e => setForm({...form, memory: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {loadingTypes ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#a1a1aa' }}><Loader2 className="spin" size={24} /></div>
            ) : typesData ? (
              <>
                {['recommended', 'established', 'experimental'].map(category => (
                  typesData[category] && Object.keys(typesData[category]).length > 0 && (
                    <div key={category}>
                      <h3 style={{ fontSize: 14, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: 12, marginTop: category === 'recommended' ? 0 : 20 }}>{category}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {Object.entries(typesData[category]).map(([typeId, typeInfo]) => (
                          <div 
                            key={typeId} 
                            onClick={() => setForm({...form, type: typeId})}
                            style={{ 
                              padding: 12, 
                              backgroundColor: form.type === typeId ? '#1e3a8a' : '#18181b', 
                              border: `1px solid ${form.type === typeId ? '#3b82f6' : '#27272a'}`,
                              borderRadius: 8,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              transition: 'all 0.2s'
                            }}
                          >
                            <img src={typeInfo.icon} alt={typeInfo.name} style={{ width: 24, height: 24 }} />
                            <span style={{ fontWeight: 500, color: form.type === typeId ? '#fff' : '#e4e4e7' }}>{typeInfo.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loadingVersions ? (
               <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#a1a1aa' }}><Loader2 className="spin" size={24} /></div>
            ) : versionsData ? (
              <div className="form-group">
                <label>Select Minecraft Version</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: 8, 
                  maxHeight: 300, 
                  overflowY: 'auto', 
                  paddingRight: 8 
                }}>
                  {versionsData.list.map(v => (
                     <div 
                     key={v} 
                     onClick={() => setForm({...form, version: v})}
                     style={{ 
                       padding: '10px 8px', 
                       backgroundColor: form.version === v ? '#1e3a8a' : '#18181b', 
                       border: `1px solid ${form.version === v ? '#3b82f6' : '#27272a'}`,
                       borderRadius: 6,
                       cursor: 'pointer',
                       textAlign: 'center',
                       fontSize: 14,
                       fontWeight: 500,
                       color: form.version === v ? '#fff' : '#e4e4e7'
                     }}
                   >
                     {v}
                   </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 16, color: '#a1a1aa' }}>
                <Loader2 className="spin" size={32} style={{ color: '#3b82f6' }} />
                <span>Creating server and downloading JAR... This may take a moment.</span>
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: 20 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Server size={18} /> {form.name}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>SOFTWARE</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{typesData && Object.values(typesData).flatMap(c => Object.values(c)).find(t => t.name.toLowerCase() === form.type?.toLowerCase())?.name || form.type} {form.version}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>MEMORY</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{form.memory} MB</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>PORT</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{form.port}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>SERVER JAR</div>
                      <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={14} /> Will be auto-downloaded
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#a1a1aa', textAlign: 'center' }}>
                  By creating this server, you agree to the Minecraft EULA automatically.
                </div>
              </>
            )}
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 16, borderTop: '1px solid #27272a' }}>
            {step > 1 ? (
              <button className="btn-secondary" onClick={() => { setError(null); setStep(s => s - 1); }}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}
            
            {step < 4 ? (
              <button className="btn-primary" onClick={nextStep}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn-primary" onClick={handleCreate} style={{ backgroundColor: '#22c55e', color: '#000' }}>
                <HardDrive size={16} /> Create Server
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
