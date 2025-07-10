
async function handler_rooms_get(request, env, ctx) {
    /*
        DBのデータは
        {
            ":room_id": {
                "name": "教室名",
                "description": "教室の説明",
                "floor": "教室の階数"
            },
            ":room_id2": {
                "name": "教室名2",
                "description": "教室の説明2",
                "floor": "教室の階数2"
            }
        }
        という形式になっている

        ※設定はAPI経由ではなく管理者がCloudflare Workers KVのコンソールから行う
     */
    let rooms_data = await env.astroclub_sf25_db_minidata.get('rooms');
    if (!rooms_data) {
        return new Response('No rooms data found', { status: 404 });
    }
    return new Response(rooms_data, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}