// Simple app using localStorage to simulate backend
(function(){
  const usersKey = 'tw_users';
  const bookingsKey = 'tw_bookings';
  const donationsKey = 'tw_donations';

  const qs = id => document.getElementById(id);

  // Elements
  const loginForm = qs('login-form');
  const authMsg = qs('auth-msg');
  const registerModal = qs('register-modal');
  const registerForm = qs('register-form');
  const registerMsg = qs('register-msg');
  const showRegisterBtn = qs('show-register');
  const closeRegisterBtn = qs('close-register');
  const appSection = qs('app-section');
  const authSection = qs('auth-section');
  const userDisplay = qs('user-display');
  const logoutBtn = qs('logout');

  const bookingForm = qs('booking-form');
  const bookingMsg = qs('booking-msg');
  const bookingsList = qs('bookings');
  const updateBtn = qs('update-booking');
  const resetBtn = qs('reset-form');

  const roomSelect = qs('room-select');
  const fromDt = qs('from-dt');
  const toDt = qs('to-dt');

  const donationAmount = qs('donation-amount');
  const donationPurpose = qs('donation-purpose');
  const showQrBtn = qs('show-qr');
  const qrModal = qs('qr-modal');
  const qrInfo = qs('qr-info');
  const confirmPay = qs('confirm-pay');
  const closeQr = qs('close-qr');
  const donationMsg = qs('donation-msg');

  // state
  let currentUser = null;
  let editBookingId = null;

  // Helpers
  function read(key){ try{ return JSON.parse(localStorage.getItem(key))||[] }catch(e){return []} }
  function write(key,val){ localStorage.setItem(key,JSON.stringify(val)) }

  function findUser(username,email,password){
    const users = read(usersKey);
    return users.find(u=>u.username===username && u.email===email && u.password===password);
  }

  // Default sample user (for quick testing)
  (function ensureSampleUser(){
    const users = read(usersKey);
    if(!users.length){
      users.push({username:'admin',email:'admin@example.com',password:'pass123'});
      write(usersKey,users);
    }
  })();

  // Login
  loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const username = qs('login-username').value.trim();
    const email = qs('login-email').value.trim();
    const password = qs('login-password').value;
    const user = findUser(username,email,password);
    if(user){
      currentUser = user;
      authMsg.textContent = 'Login successful';
      showApp();
    } else {
      authMsg.textContent = 'Invalid username or password';
      authMsg.style.color = 'crimson';
    }
  });

  function showApp(){
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    userDisplay.textContent = currentUser.username;
    renderBookings();
  }

  logoutBtn.addEventListener('click', ()=>{
    currentUser = null;
    appSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    authMsg.textContent = '';
    bookingMsg.textContent = '';
  });

  // Register
  showRegisterBtn.addEventListener('click', ()=>{ registerModal.classList.remove('hidden'); registerMsg.textContent=''; });
  closeRegisterBtn.addEventListener('click', ()=>registerModal.classList.add('hidden'));
  registerForm.addEventListener('submit', e=>{
    e.preventDefault();
    const u = qs('reg-username').value.trim();
    const em = qs('reg-email').value.trim();
    const p = qs('reg-password').value;
    if(!u||!em||!p){ registerMsg.textContent='All fields required'; return }
    const users = read(usersKey);
    if(users.find(x=>x.username===u || x.email===em)){ registerMsg.textContent='User exists'; return }
    users.push({username:u,email:em,password:p}); write(usersKey,users);
    registerMsg.textContent='Account created. You can login now.';
  });

  // Booking CRUD
  function renderBookings(){
    const bookings = read(bookingsKey).filter(b=>b.user===currentUser.email);
    bookingsList.innerHTML='';
    if(!bookings.length) bookingsList.innerHTML='<li>No bookings yet</li>';
    bookings.forEach(b=>{
      const li = document.createElement('li');
      const meta = document.createElement('div'); meta.className='booking-meta';
      meta.textContent = `${roomLabel(b.room)} | ${b.from} → ${b.to} | Rs.${b.price}`;
      const actions = document.createElement('div');
      const edit = document.createElement('button'); edit.textContent='Edit'; edit.style.marginRight='6px';
      const del = document.createElement('button'); del.textContent='Delete'; del.className='secondary';
      edit.addEventListener('click', ()=>startEdit(b.id));
      del.addEventListener('click', ()=>deleteBooking(b.id));
      actions.appendChild(edit); actions.appendChild(del);
      li.appendChild(meta); li.appendChild(actions);
      bookingsList.appendChild(li);
    })
  }

  function roomLabel(key){
    return key==='mini'?'Mini Hall (Rs.700)':key==='big'?'Big Hall (Rs.1500)':'Outdoor (Rs.1200)';
  }

  function priceFor(room){ return room==='mini'?700:room==='big'?1500:1200 }

  bookingForm.addEventListener('submit', e=>{
    e.preventDefault();
    if(!currentUser) return alert('Login required');
    const room = roomSelect.value;
    const from = fromDt.value; const to = toDt.value;
    if(!from||!to){ bookingMsg.textContent='Set from and to date/time'; return }
    // check if same user already booked same room at same time
    const bookings = read(bookingsKey);
    const conflict = bookings.find(b=>b.user===currentUser.email && b.room===room && b.from===from && b.to===to);
    if(conflict){ bookingMsg.textContent='No rooms available'; bookingMsg.style.color='crimson'; return }
    const poojas = Array.from(document.querySelectorAll('.pooja:checked')).map(i=>i.value);
    const price = priceFor(room);
    const id = 'b_'+Date.now();
    bookings.push({id,user:currentUser.email,room,from,to,poojas,price});
    write(bookingsKey,bookings);
    bookingMsg.textContent='Booking created'; bookingMsg.style.color='green';
    bookingForm.reset(); renderBookings();
  });

  function startEdit(id){
    const bookings = read(bookingsKey);
    const b = bookings.find(x=>x.id===id && x.user===currentUser.email);
    if(!b) return;
    editBookingId = id;
    roomSelect.value = b.room; fromDt.value = b.from; toDt.value = b.to;
    // poojas
    document.querySelectorAll('.pooja').forEach(ch=> ch.checked = b.poojas.includes(ch.value));
    updateBtn.classList.remove('hidden');
  }

  updateBtn.addEventListener('click', ()=>{
    if(!editBookingId) return;
    const bookings = read(bookingsKey);
    const i = bookings.findIndex(x=>x.id===editBookingId && x.user===currentUser.email);
    if(i===-1) return;
    bookings[i].room = roomSelect.value; bookings[i].from = fromDt.value; bookings[i].to = toDt.value;
    bookings[i].poojas = Array.from(document.querySelectorAll('.pooja:checked')).map(c=>c.value);
    bookings[i].price = priceFor(bookings[i].room);
    write(bookingsKey,bookings);
    bookingMsg.textContent='Booking updated'; bookingMsg.style.color='green';
    editBookingId = null; updateBtn.classList.add('hidden'); bookingForm.reset(); renderBookings();
  });

  function deleteBooking(id){
    if(!confirm('Delete booking?')) return;
    const bookings = read(bookingsKey).filter(b=>!(b.id===id && b.user===currentUser.email));
    write(bookingsKey,bookings); renderBookings();
  }

  resetBtn.addEventListener('click', ()=>{ bookingForm.reset(); editBookingId=null; updateBtn.classList.add('hidden'); bookingMsg.textContent=''; });

  // Donation flow
  showQrBtn.addEventListener('click', ()=>{
    const amt = Number(donationAmount.value);
    if(!amt || amt<=0){ donationMsg.textContent='Enter amount'; donationMsg.style.color='crimson'; return }
    qrInfo.textContent = `Amount: Rs.${amt} | Purpose: ${donationPurpose.value}`;
    qrModal.classList.remove('hidden'); donationMsg.textContent='';
  });

  closeQr.addEventListener('click', ()=> qrModal.classList.add('hidden'));

  confirmPay.addEventListener('click', ()=>{
    // simulate payment success
    const amt = Number(donationAmount.value);
    const purpose = donationPurpose.value;
    const donations = read(donationsKey);
    donations.push({id:'d_'+Date.now(),user: currentUser?currentUser.email:'guest',amount:amt,purpose,at:new Date().toISOString()});
    write(donationsKey,donations);
    qrModal.classList.add('hidden');
    donationMsg.textContent = 'Amount transfer successful. Thank you for paying!'; donationMsg.style.color='green';
  });

  // initial
  (function init(){
    // nothing else
  })();

})();
