// vitestはjsdom環境で実行されるため、"server-only"パッケージ本体をimportすると
// Client Component用のガードが例外を送出してしまう。テスト実行時のみこのスタブに解決する。
export {};
