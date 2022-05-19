import { query, queryAll } from './query'
import './style.scss'

const callButton = query<'button'>('button#callButton')
const sendTonesButton = query<'button'>('button#sendTonesButton')
const hangupButton = query<'button'>('button#hangupButton')
const durationInput = query<'input'>('input#duration')
const gapInput = query<'input'>('input#gap')
const tonesInput = query<'input'>('input#tones')
const durationValue = query<'span'>('span#durationValue')
const gapValue = query<'span'>('span#gapValue')
const sentTonesInput = query<'input'>('input#sentTones')
const dtmfStatusDiv = query<'div'>('div#dtmfStatus')
const audio = query('audio')

let pc1: RTCPeerConnection | null
let pc2: RTCPeerConnection | null
let localStream: MediaStream | null
let dtmfSender: RTCDTMFSender | null

const offerOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: false,
}

durationInput.oninput = () => {
  durationValue.textContent = durationInput.value
}

gapInput.oninput = () => {
  gapValue.textContent = gapInput.value
}

async function main() {
  addDialPadHandlers()

  sendTonesButton.disabled = true
  hangupButton.disabled = true

  callButton.addEventListener('click', () => call())
  sendTonesButton.addEventListener('click', () => handleSendTonesClick())
  hangupButton.addEventListener('click', () => hangup())
}

async function gotStream(stream: MediaStream) {
  console.log('Received local stream')
  localStream = stream
  const audioTracks = localStream.getAudioTracks()
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`)
  }
  localStream.getTracks().forEach((track) => pc1!.addTrack(track, localStream!))
  console.log('Adding Local Stream to peer connection')
  try {
    const offer = await pc1!.createOffer(offerOptions)
    await gotLocalOffer(offer)
  } catch (e) {
    console.log('Failed to create session description:', e)
  }
}

async function call() {
  console.log('Starting call')
  const servers = null
  pc1 = new RTCPeerConnection(servers ?? {})
  console.log('Created local peer connection object pc1')
  pc1.addEventListener('icecandidate', (e) => onIceCandidate(pc1!, e))
  pc2 = new RTCPeerConnection(servers ?? {})
  console.log('Created remote peer connection object pc2')
  pc2.addEventListener('icecandidate', (e) => onIceCandidate(pc2!, e))
  pc2.addEventListener('track', (e) => gotRemoteStream(e))

  console.log('Requesting local stream')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })
    await gotStream(stream)
  } catch (e) {
    console.log('getUserMedia() error:', e)
  }

  callButton.disabled = true
  hangupButton.disabled = false
  sendTonesButton.disabled = false
}

async function gotLocalOffer(desc: RTCSessionDescriptionInit) {
  console.log(`Offer from pc1\n${desc.sdp}`)
  pc1!.setLocalDescription(desc)
  pc2!.setRemoteDescription(desc)
  try {
    const answer = await pc2!.createAnswer()
    gotRemoteAnswer(answer)
  } catch (e) {
    console.log('Failed to create session description:', e)
  }
}

function gotRemoteAnswer(desc: RTCSessionDescriptionInit) {
  pc2!.setLocalDescription(desc)
  console.log(`Answer from pc2:\n${desc.sdp}`)
  pc1!.setRemoteDescription(desc)
}

function hangup() {
  console.log('Ending call')
  pc1!.close()
  pc2!.close()
  pc1 = null
  pc2 = null
  localStream = null
  dtmfSender = null
  callButton.disabled = false
  hangupButton.disabled = true
  sendTonesButton.disabled = true
  dtmfStatusDiv.textContent = 'DTMF deactivated'
}

function gotRemoteStream(e: RTCTrackEvent) {
  if (audio.srcObject !== e.streams[0]) {
    audio.srcObject = e.streams[0]
    console.log('Received remote stream')

    if (!pc1!.getSenders) {
      alert(
        'This demo requires the RTCPeerConnection method getSenders() which is not support by this browser.'
      )
      return
    }
    const senders = pc1!.getSenders()
    const audioSender = senders.find(
      (sender) => sender.track && sender.track.kind === 'audio'
    )
    if (!audioSender) {
      console.log('No local audio track to send DTMF with\n')
      return
    }
    if (!audioSender.dtmf) {
      alert('This demo requires DTMF which is not support by this browser.')
      return
    }
    dtmfSender = audioSender.dtmf
    dtmfStatusDiv.textContent = 'DTMF available'
    console.log('Got DTMFSender\n')
    dtmfSender.ontonechange = dtmfOnToneChange
  }
}

function getOtherPc(pc: RTCPeerConnection) {
  return pc === pc1 ? pc2 : pc1
}

function getName(pc: RTCPeerConnection) {
  return pc === pc1 ? 'pc1' : 'pc2'
}

async function onIceCandidate(
  pc: RTCPeerConnection,
  event: RTCPeerConnectionIceEvent
) {
  try {
    await getOtherPc(pc)!.addIceCandidate(event.candidate!)
    console.log(
      `${getName(pc)} ICE candidate: ${
        event.candidate ? event.candidate.candidate : '(null)'
      }`
    )
  } catch (e) {
    console.log('Error adding ice candidate:', e)
  }
}

function dtmfOnToneChange(tone: RTCDTMFToneChangeEvent) {
  if (tone) {
    console.log(`Sent DTMF tone: ${tone.tone}`)
    sentTonesInput.value += `${tone.tone} `
  }
}

function sendTones(tones: string) {
  if (dtmfSender && dtmfSender.canInsertDTMF) {
    const duration = durationInput.valueAsNumber
    const gap = gapInput.valueAsNumber
    console.log('Tones, duration, gap: ', tones, duration, gap)
    dtmfSender.insertDTMF(tones, duration, gap)
  }
}

function handleSendTonesClick() {
  sendTones(tonesInput.value)
}

function addDialPadHandlers() {
  const dialPad = query<'div'>('div#dialPad')
  const buttons = queryAll('button', dialPad)
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      sendTones(`${button.textContent}`)
    })
  })
}

document.addEventListener('DOMContentLoaded', main)
