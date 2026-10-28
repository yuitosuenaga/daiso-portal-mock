/** 判別ユニオンの各メンバーから`K`を取り除く（`Omit`はユニオンに対して判別を失うため分配する）。 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
