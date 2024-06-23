
const hamburger = document.querySelector('#toggle-btn'); 

hamburger.addEventListener('click', function() {
    document.querySelector('#sidebar').classList.toggle("expand");
});


const Successmsg = document.getElementById('msg-success')
if(Successmsg){
  setTimeout(()=>{
    Successmsg.style.display = 'none';
  }, 3000)
}
const Errormsg = document.getElementById('msg-fail')
if(Errormsg){
  setTimeout(()=>{
    Errormsg.style.display = 'none';
  }, 3000)
}