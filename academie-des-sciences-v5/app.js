
const toggle = document.querySelector('.mobile-toggle');
const menu = document.querySelector('.menu');
if(toggle) toggle.addEventListener('click',()=>menu.classList.toggle('open'));
document.querySelectorAll('.dropbtn').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    btn.parentElement.classList.toggle('open');
  });
});
document.addEventListener('click',()=>document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('open')));
