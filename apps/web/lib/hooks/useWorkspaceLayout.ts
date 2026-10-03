'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

type Layout = { revision:number; config:Record<string,unknown> | null };

/** Server owns acknowledged layout; the table owns only an in-flight gesture. */
export function useWorkspaceLayout(productionId:string) {
  const client=useQueryClient();
  const userId=useAuthStore(state=>state.user?.id);
  const key=['workspace-layout',productionId,userId];
  const query=useQuery({queryKey:key,queryFn:()=>apiClient<Layout>(`/api/v1/productions/${productionId}/workspace-layout`),enabled:!!productionId&&!!userId});
  const mutation=useMutation({
    scope:{id:`workspace-layout:${productionId}:${userId}`},
    mutationFn:({config,initialize=false}:{config:Record<string,unknown>;initialize?:boolean})=>{
      const current=client.getQueryData<Layout>(key);
      if(!current) throw new Error('表格布局尚未载入，请稍后重试。');
      return apiClient<Layout>(`/api/v1/productions/${productionId}/workspace-layout`,{method:'PUT',json:{revision:current.revision,config,initialize}});
    },
    onSuccess: data=>{client.setQueryData(key,data);},
    onError:()=>{void client.invalidateQueries({queryKey:key});}
  });
  return {...query, isSaving:mutation.isPending, save:(config:Record<string,unknown>,initialize=false)=>mutation.mutateAsync({config,initialize})};
}
