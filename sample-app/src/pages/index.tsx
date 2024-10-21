import { useState } from 'react';
import { Container, TextInput, Button, List, ListItem, Loader, Notification } from '@mantine/core';
import { KuromojiToken, useKuromoji } from '../hooks/useKuromoji';

const KuromojiPage: React.FC = () => {
  const { tokenize, isLoading, error } = useKuromoji();
  const [input, setInput] = useState<string>('');
  const [tokens, setTokens] = useState<KuromojiToken[]>([]);

  const handleTokenize = () => {
    const result = tokenize(input);
    setTokens(result);
  };

  return (
    <Container size="sm" mt="xl">
      <h1>Kuromoji Tokenizer</h1>

      {error && (
        <Notification color="red" title="Error">
          {error.message}
        </Notification>
      )}

      <TextInput
        label="テキストを入力してください"
        placeholder="こんにちわ、今日はご機嫌いかがでしょうか"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
        mb="md"
      />

      <Button onClick={handleTokenize} disabled={isLoading || !input} mb="lg">
        {isLoading ? <Loader size="sm" /> : 'Tokenize'}
      </Button>

      {isLoading && <Loader size="lg" />}

      <List spacing="sm" size="sm" center>
        {tokens.map((token, index) => (
          <ListItem key={index}>
            {token.surface_form} - {token.pos}
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default KuromojiPage;
