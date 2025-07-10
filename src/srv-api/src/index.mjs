/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { AutoRouter } from 'itty-router';
import { handler_rooms_get } from './endpoints/rooms/get.mjs';
import { handler_crowd_get } from './endpoints/crowd/get.mjs';
import { handler_crowd_with_roomid_get } from './endpoints/crowd/with_roomid/get.mjs';
import { handler_crowd_with_roomid_put } from './endpoints/crowd/with_roomid/put.mjs';

const router = AutoRouter();

// /rooms: 教室の一覧
router.get('/rooms', handler_rooms_get);

// /crowd: 混雑状況
router.get('/crowd', handler_crowd_get);

// /crowd/:room_id: 特定教室の混雑状況
router.get('/crowd/:room_id', handler_crowd_with_roomid_get);
router.put('/crowd/:room_id', handler_crowd_with_roomid_put);

export default {
	async fetch(request, env, ctx) {
		try {
			return await router.fetch(request, env, ctx);
		} catch (error) {
			console.error("[ERROR]", error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
};
