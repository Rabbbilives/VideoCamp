import React, { useEffect, useRef, useState } from 'react';


function App() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [namePrompt, setNamePrompt] = useState('');


  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('recordings')) || [];
    setRecordings(saved);
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);

          // Ask for name
          const newName = prompt("Enter a name for this recording:") || `Untitled ${Date.now()}`;

          const newEntry = { name: newName, url, transcript };
          let updated = [newEntry, ...recordings];

          if (updated.length > 5) updated = updated.slice(0, 5);

          setRecordings(updated);
          localStorage.setItem('recordings', JSON.stringify(updated));

          // Optional: auto-download
          const a = document.createElement('a');
          a.href = url;
          a.download = `${newName}.webm`;
          a.click();
        };
      })
      .catch((err) => alert('Camera error: ' + err.message));
  }, [recordings, transcript]);

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech Recognition not supported');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (e) => console.error('Speech error:', e);
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleStart = () => {
    setTranscript('');
    setRecordedVideoUrl(null);
    setRecording(true);
    chunksRef.current = [];
    mediaRecorderRef.current.start();
    startRecognition();
  };

  const handleStop = () => {
    setRecording(false);
    mediaRecorderRef.current.stop();
    stopRecognition();
  };

  const handleDelete = (index) => {
    const updated = [...recordings];
    updated.splice(index, 1);
    setRecordings(updated);
    localStorage.setItem('recordings', JSON.stringify(updated));
  };

  const handleReRecord = () => {
    setTranscript('');
    setRecordedVideoUrl(null);
    setNamePrompt('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🎥 Record + Transcript (Limit 5)</h1>
      <video ref={videoRef} autoPlay muted style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }} />

      <div style={{ marginTop: '10px' }}>
        <button onClick={handleStart} disabled={recording}>Start</button>
        <button onClick={handleStop} disabled={!recording} style={{ marginLeft: '10px' }}>Stop</button>
        <button onClick={handleReRecord} style={{ marginLeft: '10px' }}>Re-record</button>
      </div>

      <h3 style={{ marginTop: '20px' }}>📝 Transcript:</h3>
      <div style={{ background: '#f9f9f9', padding: '10px', minHeight: '80px' }}>
        {transcript || '...waiting for speech...'}
      </div>

      {recordedVideoUrl && (
        <>
          <h3>🎬 Playback:</h3>
          <video controls src={recordedVideoUrl} style={{ width: '100%', maxWidth: '600px' }} />
        </>
      )}

      <h3 style={{ marginTop: '30px' }}>📂 Past Recordings:</h3>
      {recordings.length === 0 && <p>No saved recordings yet.</p>}
      {recordings.map((rec, i) => (
        <div key={i} style={{ marginBottom: '20px', padding: '10px', background: '#eee', borderRadius: '8px' }}>
          <strong>📛 {rec.name}</strong>
          <br />
          <video controls src={rec.url} style={{ width: '100%', maxWidth: '500px', marginTop: '8px' }} />
          <p><strong>📝 Transcript:</strong> {rec.transcript}</p>
          <button onClick={() => handleDelete(i)} style={{ background: 'red', color: 'white' }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default App;

