import { useState, useEffect, useCallback } from "react";
import kuromoji, { Tokenizer } from "kuromoji";

export type KuromojiToken = {
  surface_form: string;
  pos: string;
  [key: string]: any;
};

export const useKuromoji = (dicPath: string = "/kuromoji-dict-sudachi/") => {
  const [tokenizer, setTokenizer] = useState<Tokenizer<KuromojiToken> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 辞書をビルド
  useEffect(() => {
    kuromoji.builder({ dicPath }).build((err: Error | null, tokenizer: Tokenizer<KuromojiToken> | undefined) => {
      if (err) {
        setError(err);
        setIsLoading(false);
        return;
      }
      setTokenizer(tokenizer || null);
      setIsLoading(false);
    });
  }, [dicPath]);

  // 形態素解析を行う関数
  const tokenize = useCallback(
    (text: string): KuromojiToken[] => {
      if (!tokenizer) {
        console.error("Tokenizer is not ready yet.");
        return [];
      }
      return tokenizer.tokenize(text) as KuromojiToken[];
    },
    [tokenizer]
  );

  return { tokenize, isLoading, error };
};
