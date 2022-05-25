import { query } from './query'
import './web/keyboard'
import './style.scss'

const control = {
  keyboard: query('menu') as VirtualKeyboardElement,
  callButton: query<'button'>('button#callButton'),
  sendTonesButton: query<'button'>('button#sendTonesButton'),
  hangupButton: query<'button'>('button#hangupButton'),
  durationInput: query<'input'>('input#duration'),
  gapInput: query<'input'>('input#gap'),
  tonesInput: query<'input'>('input#tones'),
  durationValue: query<'span'>('span#durationValue'),
  sentTonesInput: query<'input'>('input#sentTones'),
  dtmfStatusDiv: query<'div'>('div#dtmfStatus'),
  gapValue: query<'span'>('span#gapValue'),
  audio: query('audio'),
}

let pc1: RTCPeerConnection | null
let pc2: RTCPeerConnection | null
let localStream: MediaStream | null
let dtmfSender: RTCDTMFSender | null

const offerOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: false,
}

control.durationInput.oninput = () => {
  control.durationValue.textContent = control.durationInput.value
}

control.gapInput.oninput = () => {
  control.gapValue.textContent = control.gapInput.value
}

async function main() {
  addDialPadHandlers()

  control.sendTonesButton.disabled = true
  control.hangupButton.disabled = true
  control.keyboard.setAttribute('state', 'disabled')

  control.callButton.addEventListener('click', () => call())
  control.sendTonesButton.addEventListener('click', () =>
    handleSendTonesClick()
  )
  control.hangupButton.addEventListener('click', () => hangup())
}

async function gotStream(stream: MediaStream) {
  console.log('Fluxo local recebido')
  localStream = stream
  const audioTracks = localStream.getAudioTracks()
  if (audioTracks.length > 0) {
    console.log(`Usando dispositivo de áudio: ${audioTracks[0].label}`)
  }
  localStream.getTracks().forEach((track) => pc1!.addTrack(track, localStream!))
  console.log('Adicionando fluxo local à conexão de peer')
  try {
    const offer = await pc1!.createOffer(offerOptions)
    await gotLocalOffer(offer)
  } catch (e) {
    console.log('Falha ao criar a descrição da sessão:', e)
  }
}

async function call() {
  console.log('Iniciando chamada')
  const servers = null

  pc1 = new RTCPeerConnection(servers ?? {})
  console.log('Objeto de conexão de peer local criado pc1')
  pc1.addEventListener('icecandidate', (e) => onIceCandidate(pc1!, e))

  pc2 = new RTCPeerConnection(servers ?? {})
  console.log('Objeto de conexão de peer remoto criado pc2')
  pc2.addEventListener('icecandidate', (e) => onIceCandidate(pc2!, e))
  pc2.addEventListener('track', (e) => gotRemoteStream(e))

  pc1.onconnectionstatechange = (e) => {
    console.log('Estado da conexão de peer local:', pc1!.connectionState)
  }
  pc2.onconnectionstatechange = (e) => {
    console.log('Estado da conexão de peer remoto:', pc2!.connectionState)
  }

  console.log('Solicitando transmissão local')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })
    await gotStream(stream)
  } catch (e) {
    console.log('getUserMedia() error:', e)
  }

  control.callButton.disabled = true
  control.hangupButton.disabled = false
  control.sendTonesButton.disabled = false
}

async function gotLocalOffer(desc: RTCSessionDescriptionInit) {
  console.log(`Oferta do pc1\n${desc.sdp}`)
  pc1!.setLocalDescription(desc)
  pc2!.setRemoteDescription(desc)
  try {
    const answer = await pc2!.createAnswer()
    gotRemoteAnswer(answer)
  } catch (e) {
    console.log('Falha ao criar a descrição da sessão:', e)
  }
}

function gotRemoteAnswer(desc: RTCSessionDescriptionInit) {
  pc2!.setLocalDescription(desc)
  console.log(`Resposta do pc2:\n${desc.sdp}`)
  pc1!.setRemoteDescription(desc)
}

function hangup() {
  console.log('Encerrando chamada')
  pc1!.close()
  pc2!.close()
  pc1 = null
  pc2 = null
  localStream = null
  dtmfSender = null
  control.callButton.disabled = false
  control.hangupButton.disabled = true
  control.sendTonesButton.disabled = true
  control.keyboard.setAttribute('state', 'disabled')
  control.dtmfStatusDiv.textContent = 'DTMF desativado'
}

function gotRemoteStream(e: RTCTrackEvent) {
  if (control.audio.srcObject !== e.streams[0]) {
    control.audio.srcObject = e.streams[0]
    console.log('Fluxo remoto recebido')

    if (!pc1!.getSenders) {
      alert(
        'Esta demonstração requer o método RTCPeerConnection getSenders() que não é suportado por este navegador.'
      )
      return
    }
    const senders = pc1!.getSenders()
    const audioSender = senders.find(
      (sender) => sender.track && sender.track.kind === 'audio'
    )
    if (!audioSender) {
      console.log('Nenhuma faixa de áudio local para enviar DTMF com\n')
      return
    }
    if (!audioSender.dtmf) {
      alert(
        'Esta demonstração requer DTMF que não é suportado por este navegador.'
      )
      return
    }
    dtmfSender = audioSender.dtmf
    control.dtmfStatusDiv.textContent = 'DTMF disponível'
    console.log('Obteve DTMFSender\n')

    dtmfSender.ontonechange = dtmfOnToneChange

    if (control.keyboard.state === 'disabled') {
      control.keyboard.setAttribute('state', 'enabled')
    }
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
    if (event.candidate) {
      await getOtherPc(pc)!.addIceCandidate(event.candidate!)
      console.log(
        `${getName(pc)} ICE candidate: ${
          event.candidate ? event.candidate.candidate : '(null)'
        }`
      )
    }
  } catch (e) {
    console.log('Error adding ice candidate:', e)
  }
}

function dtmfOnToneChange(tone: RTCDTMFToneChangeEvent) {
  if (tone) {
    console.log(`Enviado tom DTMF: ${tone.tone}`)
    control.sentTonesInput.value += `${tone.tone} `
  }
}

function sendTones(tones: string) {
  if (dtmfSender && dtmfSender.canInsertDTMF) {
    const duration = control.durationInput.valueAsNumber
    const gap = control.gapInput.valueAsNumber
    console.log('Tons, duração, intervalo: ', tones, duration, gap)
    dtmfSender.insertDTMF(tones, duration, gap)
  }
}

function handleSendTonesClick() {
  sendTones(control.tonesInput.value)
}

function addDialPadHandlers() {
  control.keyboard.addEventListener('pressed', (e) => sendTones(e.key))
}

document.addEventListener('DOMContentLoaded', main)
