require('../../styles/main.less');

import './util/registerPolyfill';
import './util/registerErrorHandler';

import { createStore } from 'redux';
import reducer from './reducer';

import ws from './ws';

import levelGen from '../universal/levelGen';
import RunLoop from '../universal/RunLoop';

import { renderControlBar } from './controlBar';
import { registerListeners } from './util/inputter';
import inputHandler from './inputHandler';
import scaleCanvas from './util/scaleCanvas';

import render from './render';

import {
  WIDTH,
  HEIGHT,
} from '../universal/constants';

import testMsgs from '../testData';

function main() {
  // Bail out early if missing required browser features
  // XXX: typescript doesn't think window.WebSocket exists?
  if (!(<any>window).WebSocket) {
    const el = document.getElementsByClassName('game-container')[0];
    el.innerHTML = `
      <div class="browser-error">
        <p>
          Your browser does not support WebSockets, which are required for Manygolf to work.
        </p>
        <p>
          Please upgrade your browser to one of the following: Google Chrome, Firefox 11+, Internet
          Explorer 10+, or Safari 6+.
        </p>
      </div>
    `;
    return;
  }

  // set up canvas
  const canvas = <HTMLCanvasElement> document.getElementById('game');
  scaleCanvas(canvas, WIDTH, HEIGHT);

  window.onresize = () => {
    scaleCanvas(canvas, WIDTH, HEIGHT);
  };

  const ctx = canvas.getContext('2d');

  // Set up store
  const store = createStore(reducer);

  // create mobile controls
  renderControlBar();

  // create websocket or use offline mode
  const offlineMode = document.location.search.indexOf('offline') !== -1;

  if (!offlineMode) {
    ws.init(store);

  } else {
    const initTime = testMsgs[0].time;

    for (let msg of testMsgs) {
      const timeDiff = msg.time - initTime;

      setTimeout(() => {
        console.log(msg.time);

        store.dispatch({
          type: `ws:${msg.msg.type}`,
          data: msg.msg.data,
        });
      }, timeDiff);
    }
  }

  // set up input event listeners
  registerListeners();

  // Set up runLoop
  const runLoop = new RunLoop();

  runLoop.onTick((dt: number) => {
    dt = dt / 1000;  // ms -> s
    const dispatch = store.dispatch.bind(store);

    const prevState = store.getState();

    inputHandler(dt, prevState, dispatch);

    dispatch({
      type: 'tick',
      dt,
    });

    const newState = store.getState();

    render(ctx, newState);

    if (newState.name !== prevState.name) {
      updateTwitterLink(newState.name);
    }
  });

  runLoop.start();
}

function updateTwitterLink(name: string) {
  const link = <HTMLAnchorElement>document.getElementById('twitter-link');

  const text = `Come play #Manygolf with me! I'm playing as ${name}`;
  const encoded = encodeURIComponent(text);

  const linkUrl = `https://twitter.com/intent/tweet?text=${encoded}` +
                  '&url=http%3A%2F%2Fmanygolf.club';

  link.href = linkUrl;
}

main();