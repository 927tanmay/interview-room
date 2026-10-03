import { useEffect } from 'react'
import { Orb } from '../components/Orb'
import { heard, interview } from '../interview/session'
import { DEFAULT_SETTINGS } from '../interview/settings'
import { Interview } from '../screens/Interview'
import { setAudioLevel, setVoice } from '../voice/voiceStore'

// Dev only (`?dev=room`): the interview room beside the phone-screen orb, with
// the real interview engine but no models or voice. Drive it from the console
// through the app's own modules:
//   __room.heard('Pretty good, thanks.'); __room.interview.done()
//   __room.setVoice({ status: 'listening' }); __room.setAudioLevel(0.6, 'mic')
export default function RoomPreview() {
  useEffect(() => {
    Object.assign(window, { __room: { heard, interview, setAudioLevel, setVoice } })
  }, [])

  return (
    <div className="app app--interview">
      <main>
        <Interview display="phone" settings={{ ...DEFAULT_SETTINGS, answerMinutes: 1 }} onEnd={() => {}} />
      </main>
      <div className="voice-host">
        <div className="stage stage-phone">
          <Orb label="Ananya" />
        </div>
      </div>
    </div>
  )
}
