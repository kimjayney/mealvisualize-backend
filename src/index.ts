/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { v4 as uuidv4 } from 'uuid';

export interface Env {
	DB: D1Database;
}


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const { pathname } = new URL(request.url);
		const url = new URL(request.url)
		const params = new URLSearchParams(url.search)
		const headers = new Headers({
			"Access-Control-Allow-Origin": "https://mealvisualize.rainclab.net", // Access-Control-Allow-Origin...뭘로고칠까..?ㅠㅠ
			"Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		})
		if( pathname == '/healthcheck') {
			  const { results } = await env.DB.prepare(
				`SELECT MealId FROM MealDb LIMIT 1,1`
			  ).all(); 
			  // const ip = await getIP()
			  if(results?.length > 0)  {
				return new Response(JSON.stringify({
				  success: true, 
				  status: true,
				  message_en_US:"Operational",
				  message_ko_KR: "작동 중 입니다.", 
				}), {headers})
			  } else {
				return new Response(JSON.stringify({
				  success: true, 
				  status: false,
				  message_en_US:"unavailable",
				  message_ko_KR: "DB 서버에 문제가 생겼습니다. 관리자에게 문의 주세요. "
				}), {headers})
			  }
		}
		 

		if (pathname == '/api/get') {
			const all = ['Location','mealType','feel', 'price', 'rating' ]
			let additionalQuery = [];
			all.forEach((item) => {
				const getvalues = params.get(item);
				if (getvalues) {
					let getvaluesitem = getvalues.split(",") 
					let preprocessed = [] 
					getvaluesitem.forEach(element => {
						if (item == "rating") {
							var regex = /[+-]?\d+(\.\d+)?/g;
							var onlyfloat = element.match(regex).map(function(v) { return parseFloat(v); });
							preprocessed.push(`'${onlyfloat}'`) 
						} else {
							var onlyletters = element.replace(/[^a-zA-Z|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+/g, '');
							preprocessed.push(`'${onlyletters}'`)
						} 
					}); 
					additionalQuery.push(`${item} IN (${preprocessed.join(",")}) `)
				}
			})
			
			if (additionalQuery.length > 0) { 
				let sql = `SELECT * FROM Mealdb where ${additionalQuery.join(" and ")} and ADMIN_OK = 1 `
				console.log(sql)
				const { results } = await env.DB.prepare(
					sql
					).all()
					 
					return new Response(JSON.stringify({
						success: true, 
						status: true,
						message_en_US:"Service",
						message_ko_KR: "Service ",
						query : `SELECT * FROM Mealdb where ${additionalQuery.join(" and ")} `, 
						data: results, 
					}), {headers})
			} else {
				const { results } = await env.DB.prepare(
					`SELECT * FROM Mealdb where ADMIN_OK = true`
					).all();
				
				return new Response(JSON.stringify({
					success: true, 
					status: true,
					message_en_US:"Service",
					message_ko_KR: "Service ",
					data: results
				}), {headers})
			} 
		}
		
		if (pathname == '/api/post') {
			const name = params.get('name')
			const location = params.get('locations')
			const mealtype = params.get('mealtype')
			const feel = params.get('feel')
			const price = params.get('price')
			const rating = params.get('rating')
			const address = params.get('address')
			const REVIEW_CONTENT = params.get('review_content')
			const lat = params.get('lat')
			const lng = params.get('lng')
			const uuid = uuidv4()

			const { results } = await env.DB.prepare(
				`SELECT * FROM Mealdb WHERE NAME = ? and Address = ?`
			  ).bind(name, address).all();
			  
			  if (results?.length < 1) {
				const { results } = await env.DB.prepare(
				  "INSERT INTO Mealdb(NAME, Location, Mealtype, Feel, Price, Rating, REVIEW_CONTENT, Lat, Lng, Address, ADMIN_OK, uuid) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				)
				.bind(name, location, mealtype, feel,price,rating,REVIEW_CONTENT,lat, lng, address , 'false', uuid)
				.all();
				console.log(results)
				if (results) {
					const replyText = {
						text : `새로운 맛집 승인 요청입니다. ${name}, ${mealtype}, ${location}, ${rating}, ${address}, ${REVIEW_CONTENT}, ${lat}, ${lng}
						승인하기: https://backend.rainclab.workers.dev/api/admin_ok?secretkey=${env.SECRET_ACCEPT_MEAL}&mealid=${uuid}`,
					}
					const slackPoster = await fetch(env.SECRET_SLACK_WEBHOOK, {
						body: JSON.stringify(replyText) ,
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
					});

					return new Response(JSON.stringify({
						success: true, 
						status: true,
						code: 201,
						message_en_US:"Created",
						message_ko_KR: "정상등록됨. 관리자 승인후 올라감.", 
					}), {headers})
				}
				

			  } else {
				
				return new Response(JSON.stringify({
					success: true, 
					status: false,
					code: 500,
					message_en_US:"Error",
					message_ko_KR: "이미 등록되어있음", 
				}), {headers})
			  }
		}
		if (pathname == '/api/admin_ok') {
			const secretkey = params.get('secretkey')
			const mealid = params.get('mealid')
			if (secretkey === env.SECRET_ACCEPT_MEAL) {
				const { results } = await env.DB.prepare(
					`UPDATE Mealdb set ADMIN_OK = true where uuid = ?`
					).bind(mealid).all();

				if (results) {
					return new Response(JSON.stringify({
						success: true, 
						status: true,
						code: 200,
						message_en_US:"ok",
						message_ko_KR: "처리완료", 
					}), {headers})
				} else {
					return new Response(JSON.stringify({
						success: true, 
						status: false,
						code: 500,
						message_en_US:"no meal id",
						message_ko_KR: "meal id가 없는듯 or query 문제", 
					}), {headers})
				}
				
			} else {
				return new Response(JSON.stringify({
					success: true, 
					status: false,
					code: 403,
					message_en_US:"auth problem",
					message_ko_KR: "생각을해보세요", 
				}), {headers})
			}
		}
	 

		return new Response('mealdb api server');
	},
};
