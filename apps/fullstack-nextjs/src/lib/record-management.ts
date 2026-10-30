import {z} from 'zod';
export const designManagement=z.discriminatedUnion('action',[z.object({action:z.literal('edit'),title:z.string().trim().min(1).max(200),description:z.string().max(5000)}),z.object({action:z.literal('trash')}),z.object({action:z.literal('restore')})]);
export const promptManagement=z.discriminatedUnion('action',[z.object({action:z.literal('edit'),prompt:z.string().trim().min(1).max(20000)}),z.object({action:z.literal('trash')}),z.object({action:z.literal('restore')})]);
