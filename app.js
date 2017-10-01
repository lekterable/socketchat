const mongodb = require('mongodb').MongoClient
const config = require('./config')
const path = require('path')
const express = require('express');
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

//Folder Publiczny
app.use(express.static(path.join(__dirname, 'public')))
//Połączenie z bazą
mongodb.connect(config.database, (err, db)=>{
  if(err)
    throw err
  console.log('Połączono z bazą')
  let chat = db.collection('chats')
  let users = []
  //Połączenie z serwerem Socket.IO
  io.on('connection', (socket)=>{
    socket.on('login', (data, cb)=>{
      if (users.indexOf(data.username)!=-1) {
        if(!socket.logged)
          socket.emit('info', {message:'Nazwa użytkownika jest już zajęta!', type:'alert alert-danger'})
        return cb(false)
      }
      socket.username = data.username
      socket.logged = true
      users.push(data.username)
      io.emit('users', users)
      socket.emit('info', {message:'Zalogowano!', type:'alert alert-success'})
      return cb(true)
    })
    socket.emit('users', users)
    socket.emit('cleared')
    chat.find().limit(100).sort({_id:1}).toArray((err, res)=>{
      if(err)
        throw err
      socket.emit('chat message', res)
    })
    socket.on('new message', (message, cb)=>{
      if(message[0].data==''){
        socket.emit('info', {message:'Uzupełnij wiadomość!', type:'alert alert-danger'})
        return cb(false)
      }
      else if (!socket.logged) {
        socket.emit('info', {message:'Zaloguj się!', type:'alert alert-danger'})
        return cb(false)
      }
      else {
        chat.insert({
          name: socket.username,
          data: message[0].data
        })
        io.emit('chat message', [{
          name: socket.username,
          data: message[0].data
        }])
        socket.emit('info', {message:'Wysłano wiadomość', type:'alert alert-success'})
        socket.broadcast.emit('info', {message:'Nowa wiadomość', type:'alert alert-info'})
        return cb(true)
      }
    })
    socket.on('clear', ()=>{
      chat.remove({}, ()=>{
        io.emit('cleared')
        io.emit('info', {message: 'Czat wyczyszczony', type:'alert alert-info'})
      })
    })
    socket.on('disconnect', ()=>{
      if(socket.logged){
        users.splice(users.indexOf(socket.username), 1)
        io.emit('users', users)}
    })
  })
})

http.listen(3000, ()=>{
  console.log('Serwer uruchomiony na porcie 3000')
})
