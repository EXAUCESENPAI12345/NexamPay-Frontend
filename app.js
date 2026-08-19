"use strict";
(function(){
  if(!window.NexamPayCore)return;
  window.NexamPay=window.NexamPay||{};
  Object.assign(window.NexamPay,{
    apiRequest:window.NexamPayCore.request,
    authenticate:window.NexamPayCore.authenticate,
    getProfile:window.NexamPayCore.getProfile,
    getWallet:window.NexamPayCore.getWallet,
    getCountries:window.NexamPayCore.getCountries,
    getNetworks:window.NexamPayCore.getNetworks,
    copy:window.NexamPayCore.copy,
    version:window.NexamPayCore.APP_VERSION
  });
})();
