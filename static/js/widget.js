(function (w, d) {
  'use strict';

  if (w.DBOX_EMBEDED) return;
  w.DBOX_EMBEDED = true;

  var IFRAME_SELECTOR = 'iframe[name=donorbox]',
      DATA_ATTR = 'data-donorbox-id',
      UTM_PARAMS = extractUtmParams(),
      notBusyWithIDs = true;

  function extractUtmParams() {
    var data = {}, queryString = w.location.href.split('?')[1];

    if (queryString) {
      var params = queryString.split('&'),
          supportedUtmParams = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content'];

      params.forEach(function(p) {
        var splitted = p.split('='), key = splitted[0], value = splitted[1];

        if (supportedUtmParams.indexOf(key) >= 0) data[key] = value
      })
    }

    return Object.keys(data).length && data
  }

  function sendMessage(iFrame, action, msg) {
    iFrame.contentWindow.postMessage({
      action: action, msg: msg
    }, '*')
  }

  function onloadProcessing() {
    var iFrames = d.querySelectorAll(IFRAME_SELECTOR),
        allowPaymentRequestParam = 'allowpaymentrequest', applePayParam = 'allow';

    for (var i = 0; i < iFrames.length; i++) {
      var iframe = iFrames[i], src = iframe.src;

      update(iframe, i);

      if (
        (!iframe.hasAttribute(allowPaymentRequestParam) ||
          !iframe.hasAttribute(applePayParam)) &&
        src.indexOf("only_don") == -1
      ) {
        iframe.setAttribute(allowPaymentRequestParam, true);
        iframe.setAttribute(applePayParam, "payment");
        if(iframe?.src != ''){
          iframe.src = src + (src.indexOf("?") > -1 ? "&" : "?") + "a=b";
        }
      }
    }
  }

  function justSendTheID(iFrame) {
    sendMessage(iFrame, 'set-iframe-id', iFrame.getAttribute(DATA_ATTR))
  }

  function sendIDAndUTM(iFrame) {
    justSendTheID(iFrame);
    UTM_PARAMS && sendMessage(iFrame, 'set-utm-params', UTM_PARAMS)
  }

  function update(iFrame, num) {
    iFrame.setAttribute(DATA_ATTR, 'DonorBox-f' + (num + 1));

    iFrame.onload = sendIDAndUTM.bind(null, iFrame);
    sendIDAndUTM(iFrame)
  }

  function tryUpdateIFramesIDs() {
    var iFrames = d.querySelectorAll(IFRAME_SELECTOR),
        hasIDs = d.querySelectorAll('iframe[' + DATA_ATTR + ']');

    if (iFrames.length == hasIDs.length)
      for (var i = 0; i < iFrames.length; i++)
        justSendTheID(iFrames[i]);
    else
      for (var i = 0; i < iFrames.length; i++)
        update(iFrames[i], i);
    notBusyWithIDs = true
  }

  function findBy(dataID) {
    return d.querySelector('iframe[' + DATA_ATTR + '="' + dataID + '"]')
  }

  function onMessage(e) {
    var data = e.data, iFrame;

    if (!data || typeof data != 'object' || data.from != 'dbox' || data.close) return;

    if(data.tgbWidget) {
      var tgbTrigger = document.createElement("button");
      var tgbScript  = document.createElement("script");

      tgbTrigger.setAttribute('id', 'tgb-widget-button');
      tgbScript.setAttribute('id', 'tgb-widget-script');

      tgbTrigger.style.display = 'none';

      document.body.appendChild(tgbTrigger);
      document.body.appendChild(tgbScript);

      !function t(e,i,n,g,x,r,s,d,a,y,w,q,c,o) {
        var p="tgbWidgetOptions";e[p]?(e[p]=e[p].length?e[p]:[e[p]],  e[p].push({id:r,apiUserUuid:x,domain:g,buttonId:d,scriptId:s,uiVersion:a,donationFlow:y,fundraiserId:w,campaignId:q}))  :e[p]={id:r,apiUserUuid:x,domain:g,buttonId:d,scriptId:s,uiVersion:a,donationFlow:y,fundraiserId:w,campaignId:q},  (c=i.createElement(n)).src=[g,"/widget/script.js"].join(""),c.async=1,  (o=i.getElementById(s)).parentNode.insertBefore(c,o)  }
        (window,document,"script",data.url , data.uuid, data.orgId, "tgb-widget-script","tgb-widget-button",   "2", "", "", data.formId);
    }

    if(data.tgbTrigger) {
      var tgbTrigger = document.querySelector('#tgb-widget-button');
      tgbTrigger.click();
    }

    if (data.src.indexOf('forms/color') != -1)
      iFrame = d.querySelector(IFRAME_SELECTOR);
    else
      iFrame = findBy(data.iframeID);

    if (!iFrame) {
      if (notBusyWithIDs) {
        notBusyWithIDs = false;
        setTimeout(tryUpdateIFramesIDs, 50);
      }
      return
    }

    if (data.scrollIntoView) {
      (iFrame.offsetTop < w.pageYOffset ||
       iFrame.offsetTop > w.pageYOffset + w.innerHeight) &&
         iFrame.scrollIntoView()
    } else {
      if (parseInt(data.height, 10) > 0) {
        const maxHeight = parseInt(iFrame.style.maxHeight, 10);
        if (data.src?.includes('/preview/')) {
          iFrame.style.height = `${iFrame.contentDocument.querySelector('.container').clientHeight}px`;
        } else if (iFrame.style.maxHeight !== 'none' && !Number.isNaN(maxHeight)) {
          const currentHeight = parseInt(iFrame.style.height, 10);
          if (
            (
              iFrame.scrolling !== 'yes'
              || (currentHeight < (data.height + 3))
            ) && ((data.height + 3) <= maxHeight)
          ) {
            iFrame.style.height = `${data.height + 3}px`;
          }
          iFrame.scrolling = 'yes';
        } else {
          iFrame.style.height = `${data.height + 3}px`;
        }
      }

      w.innerWidth < 350 && (iFrame.style.minWidth = 'initial');
    }
  }

  if (d.querySelector('script[paypalExpress=true]')) {
    var paypal = d.createElement('script');
    paypal.src = 'https://www.paypalobjects.com/api/checkout.js';
    d.head.appendChild(paypal);
  }

  w.addEventListener('message', onMessage, false);

  d.readyState !== 'complete' ?
    d.addEventListener('DOMContentLoaded', onloadProcessing) :
    onloadProcessing();


  // Public API
  w.donorbox = w['donorbox'] = {
    resizeDonationWidget: function(iFrameSelector) {
      var query = iFrameSelector || IFRAME_SELECTOR, el = iFrameSelector, iframe;

      if (el instanceof HTMLIFrameElement && el.name === 'donorbox') iframe = el;

      iframe = iframe || d.querySelector(query);
      if (!iframe) console.error(
        'donorbox.resizeDonationWidget: "' + query +
        '" is not a valid selector. Use your embedded iframe, its ID or class instead');

      sendMessage(iframe, 'please-resize-me')
    }
  }

}(window, document));
