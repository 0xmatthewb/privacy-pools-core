declare module "async" {
  export function mapLimit<T, R>(
    collection: Iterable<T> | ArrayLike<T>,
    limit: number,
    iteratee: (item: T) => Promise<R> | R,
  ): Promise<R[]>;
}
