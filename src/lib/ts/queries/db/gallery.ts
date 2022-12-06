import type { TAvailableModelId, TAvailableSchedulerId } from '$ts/constants/main';
import { supabaseAdmin } from '$ts/constants/supabaseAdmin';
import type { TDBGenerationG } from '$ts/types/db';
import type { TGalleryResponse } from '$ts/types/main';
import type { PostgrestError } from '@supabase/supabase-js';

const batch = 50;

type TGetType = 'visible-only' | 'hidden-only' | 'all';

export async function getGalleryPage(page: number, getType: TGetType = 'visible-only') {
	if (!supabaseAdmin) {
		console.log('No Supabase instance found');
		return { status: 500, error: 'No Supabase instance found' };
	}
	console.log(`---- Request for gallery page: ${page} ----`);
	const pagePromise = supabaseAdmin
		.from('generation_g')
		.select(
			`
			width,
			height,
			prompt:prompt_id(id,text),
			negative_prompt:negative_prompt_id(id,text),
			model:model_id(id,name),
			scheduler:scheduler_id(id,name),
			seed,
			inference_steps,
			guidance_scale,
			image_id,
			created_at,
			updated_at,
			id
		`
		)
		.filter(
			'hidden',
			'in',
			getType === 'all' ? '(true,false)' : getType === 'hidden-only' ? '(true)' : '(false)'
		)
		.order('created_at', { ascending: false })
		.range((page - 1) * batch, page * batch - 1);
	const nextPromise = supabaseAdmin
		.from('generation_g')
		.select(
			`
			width,
			height,
			prompt:prompt_id(id,text),
			negative_prompt:negative_prompt_id(id,text),
			model:model_id(id,name),
			scheduler:scheduler_id(id,name),
			seed,
			inference_steps,
			guidance_scale,
			image_id,
			created_at,
			updated_at,
			id
		`
		)
		.filter(
			'hidden',
			'in',
			getType === 'all' ? '(true,false)' : getType === 'hidden-only' ? '(true)' : '(false)'
		)
		.order('created_at', { ascending: false })
		.range(page * batch, page * batch);
	// @ts-ignore
	const [pageRes, nextRes]: [TGenerationGPage, TGenerationGPage] = await Promise.all([
		pagePromise,
		nextPromise
	]);
	const { data: pageData, error: pageError }: TGenerationGPage = pageRes;
	const { data: nextData, error: nextError }: TGenerationGPage = nextRes;
	if (pageError || nextError || !pageData || !nextData) {
		console.log('Error getting generations:', pageError || nextError);
		return { status: 500, error: 'Error getting generations' };
	}
	let next: number | null = null;
	if (nextData?.length > 0) next = page + 1;
	console.log(`---- Responding to gallery page request -- Page: ${page} -- Next: ${next} ----`);
	const data: TDBGenerationG[] = pageData.map((d) => {
		const { prompt, negative_prompt, model, scheduler, ...rest } = d;
		return {
			...rest,
			prompt: prompt as { id: string; text: string },
			negative_prompt: (negative_prompt as { id: string; text: string } | null)
				? (negative_prompt as { id: string; text: string })
				: null,
			model: model as { id: TAvailableModelId; name: string },
			scheduler: scheduler as { id: TAvailableSchedulerId; name: string }
		};
	});
	const response: TGalleryResponse = {
		generations: data,
		page,
		next
	};
	return response;
}

export async function getGenerationG(id: string) {
	if (!supabaseAdmin) {
		console.log('No Supabase instance found');
		return { data: null, error: 'No Supabase instance found' };
	}
	const { data, error } = await supabaseAdmin
		.from('generation_g')
		.select(
			`
			width,
			height,
			prompt:prompt_id(id,text),
			negative_prompt:negative_prompt_id(id,text),
			model:model_id(id,name),
			scheduler:scheduler_id(id,name),
			seed,
			inference_steps,
			guidance_scale,
			image_id,
			created_at,
			updated_at,
			id
		`
		)
		.filter('id', 'eq', id)
		.maybeSingle();
	if (error) console.log(error);
	if (data) {
		const generation: TDBGenerationG = {
			id: data.id as string,
			width: data.width,
			height: data.height,
			seed: data.seed,
			inference_steps: data.inference_steps,
			guidance_scale: data.guidance_scale,
			image_id: data.image_id,
			created_at: data.created_at,
			updated_at: data.updated_at,
			prompt: data.prompt as { id: string; text: string },
			negative_prompt: (data.negative_prompt as { id: string; text: string } | null)
				? (data.negative_prompt as { id: string; text: string })
				: null,
			model: data.model as { id: TAvailableModelId; name: string },
			scheduler: data.scheduler as { id: TAvailableSchedulerId; name: string }
		};
		return { data: generation, error: null };
	}
	return { data: null, error: 'Something went wrong' };
}

interface TGenerationGPage {
	data: TDBGenerationG[] | null;
	error: PostgrestError | null;
}
