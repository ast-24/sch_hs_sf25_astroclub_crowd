import { AutoRouter } from 'itty-router';
import { handler_rooms_get } from './endpoints/rooms/get.mjs';
import { handler_crowd_get } from './endpoints/crowd/get.mjs';
import { handler_crowd_with_roomid_get } from './endpoints/crowd/with_roomid/get.mjs';
import { handler_crowd_with_roomid_put } from './endpoints/crowd/with_roomid/put.mjs';

const router = AutoRouter();

router.get('/rooms', handler_rooms_get);
router.get('/crowd', handler_crowd_get);
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
