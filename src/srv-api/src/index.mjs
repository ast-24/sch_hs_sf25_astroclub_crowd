/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Router } from 'itty-router';
import { handler_rooms_get } from './endpoints/rooms/get.mjs';

const router = Router();

// /rooms: 教室の一覧
router.get('/rooms', handler_rooms_get);

// /crowd: 混雑状況
router.head('/crowd', async (request, env, ctx) => {
	// TODO: 全教室の混雑状況の更新状況確認
	return new Response("crowd endpoint - HEAD");
});
router.get('/crowd', async (request, env, ctx) => {
	// TODO: 全教室の混雑状況取得
	return new Response('crowd endpoint - GET');
});

// /crowd/:room_id: 特定教室の混雑状況
router.head('/crowd/:room_id', async (request, env, ctx) => {
	// TODO: 特定教室の混雑状況の更新状況確認
	return new Response("crowd/:room_id endpoint - HEAD");
});
router.get('/crowd/:room_id', async (request, env, ctx) => {
	// TODO: 特定教室の混雑状況取得
	return new Response('crowd/:room_id endpoint - GET');
});
router.put('/crowd/:room_id', async (request, env, ctx) => {
	// TODO: 混雑状況更新
	return new Response('crowd/:room_id endpoint - PUT');
});

export default {
	async fetch(request, env, ctx) {
		return await router.handle(request, env, ctx);
	},
};
