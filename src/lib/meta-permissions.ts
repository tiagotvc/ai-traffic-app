/**
 * Resultado do App Review da Meta: todas as permissões pedidas foram aprovadas
 * **exceto** `instagram_basic`. Sem ela, a Graph API recusa `/{ig-user}/media` e
 * `instagram_business_account`, então promover um post existente do Instagram
 * como criativo não funciona.
 *
 * Este é o único interruptor do recurso — ao aprovar `instagram_basic`, basta
 * virar para `true`: o scope volta a ser pedido no OAuth e a opção "Post do
 * Instagram" reaparece no criador de campanha.
 */
// Tipado como boolean (e não como o literal `false`) para o TS não estreitar os
// ramos "aprovado" a código morto enquanto a permissão estiver negada.
export const META_INSTAGRAM_BASIC_GRANTED: boolean = false;
