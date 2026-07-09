let _fn = null;
export const registerToast = (fn) => { _fn = fn; };
export const toast = (msg, type = 'info') => {
  if (_fn) _fn(String(msg), type);
  else console.warn('[toast]', msg);
};
export const toastError = (msg) => toast(msg, 'error');
export const toastSuccess = (msg) => toast(msg, 'success');
