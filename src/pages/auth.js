import { signIn, signUp, resetPassword } from '../services/auth.js';
import { isSupabaseConfigured } from '../config/config.js';
import { toast } from '../components/notification.js';

export function authPage(){
  return `<main class="auth-shell"><section class="auth-card"><div class="brand auth-brand"><div class="brand-mark">LB</div><div><strong>Labour Book</strong><small>Management system</small></div></div>
  ${isSupabaseConfigured?'':'<div class="setup-banner">Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment file.</div>'}
  <form id="authForm" class="auth-form"><h1>Welcome back</h1><p>Sign in to manage your business records.</p>
  <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
  <div class="field"><label>Password</label><input name="password" type="password" required minlength="6" autocomplete="current-password"></div>
  <div class="field auth-business" hidden><label>Business name</label><input name="businessName" autocomplete="organization"></div>
  <button class="button primary auth-submit" type="submit">Sign in</button>
  <div class="auth-links"><button type="button" class="link-button" id="authToggle">Create account</button><button type="button" class="link-button" id="resetPassword">Forgot password?</button></div></form></section></main>`;
}
export function bindAuth(){
  const form=document.querySelector('#authForm'), toggle=document.querySelector('#authToggle'), reset=document.querySelector('#resetPassword'), business=document.querySelector('.auth-business'), submit=document.querySelector('.auth-submit');
  let registering=false;
  toggle.onclick=()=>{registering=!registering;form.querySelector('h1').textContent=registering?'Create account':'Welcome back';submit.textContent=registering?'Create account':'Sign in';business.hidden=!registering;toggle.textContent=registering?'Sign in instead':'Create account'};
  form.onsubmit=async e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(form));submit.disabled=true;
    try{if(registering)await signUp(data.email,data.password,data.businessName||'Labour Business');else await signIn(data.email,data.password);location.hash='#/dashboard';location.reload()}catch(err){toast(err.message,'error')}finally{submit.disabled=false}
  };
  reset.onclick=async()=>{const email=form.elements.email.value;if(!email){toast('Enter your email first','error');return}try{await resetPassword(email);toast('Password reset email sent','success')}catch(e){toast(e.message,'error')}};
}
