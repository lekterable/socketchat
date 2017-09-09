const mongodb = require('mongodb').MongoClient
const config = require('./config')
const path = require('path')
const express = require('express');
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
//Folder Publiczny
app.use(express.static(path.join(__dirname, 'public')))
//Strona główna
app.get('/', (req, res)=>{
  res.sendFile('./index.html', {root:__dirname})
})
//Połączenie z bazą
mongodb.connect(config.database, (err, db)=>{
  if(err)
    throw err
  console.log('Połączono z bazą')
  let chat = db.collection('chats')
  //Połączenie z serwerem Socket.IO
  io.on('connection', (socket)=>{
    socket.emit('cleared')
    chat.find().limit(100).sort({_id:1}).toArray((err, res)=>{
      if(err)
        throw err
      socket.emit('chat message', res)
    })
    socket.on('new message', (message)=>{
      if(message[0].name=='' || message[0].data==''){
        socket.emit('info', {message:'Uzupełnij imię i wiadomość', type:'alert alert-danger'})
      }
      else {
        chat.insert({
          name: message[0].name,
          data: message[0].data
        })
        io.emit('chat message', message)
        socket.emit('info', {message:'Wysłano wiadomość', type:'alert alert-success'})
        socket.broadcast.emit('info', {message:'Nowa wiadomość', type:'alert alert-info'})
      }
    })
    socket.on('clear', ()=>{
      chat.remove({}, ()=>{
        io.emit('cleared')
        io.emit('info', {message: 'Czat wyczyszczony', type:'alert alert-info'})
      })
    })
  })
})

http.listen(3000, ()=>{
  console.log('Serwer uruchomiony na porcie 3000')
})
