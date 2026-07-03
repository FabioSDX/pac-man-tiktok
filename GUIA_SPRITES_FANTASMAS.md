# Guia de Criação de Sprites para os Fantasmas

Este guia descreve os requisitos técnicos, formatos, tamanhos e poses necessárias para substituir a renderização vetorial atual dos fantasmas no jogo por **sprites desenhados à mão**.

---

## 1. Especificações Técnicas

Para garantir que os sprites fiquem nítidos e se alinhem perfeitamente com a grade (grid) do jogo, siga estas especificações:

| Item | Especificação | Observação |
| :--- | :--- | :--- |
| **Formato** | **PNG com canal alfa (RGBA)** | Essencial para transparência de fundo (sem quadrados brancos/pretos ao redor do fantasma). |
| **Tamanho Ideal** | **64 x 64 pixels** | Este é o tamanho padrão do cache de renderização. O centro do fantasma deve estar no centro exato da imagem de $64 \times 64$ pixels. |
| **Resolução Alternativa** | **128 x 128 pixels** | Se preferir desenhos em alta definição, você pode desenhá-los em $128 \times 128$ px. O jogo redimensionará automaticamente para caber na grade, mantendo mais detalhes. |
| **Alinhamento** | **Centralizado** | Certifique-se de que o corpo do fantasma esteja centralizado na área de desenho para evitar que ele pareça desalinhado ou "flutue" incorretamente nas curvas. |

---

## 2. Poses e Estados Necessários

Para que as animações e comportamentos atuais sejam mantidos, cada fantasma precisa das seguintes variações:

### A. Movimento Normal (4 Direções × 2 Frames)
Para dar a sensação de que o fantasma está se movendo (com a base ondulada mexendo), são necessários **2 frames de animação por direção**:
1. **Olhando para a Esquerda** (Frame 1 e Frame 2)
2. **Olhando para a Direita** (Frame 1 e Frame 2)
3. **Olhando para Cima** (Frame 1 e Frame 2)
4. **Olhando para Baixo** (Frame 1 e Frame 2)

> **Dica de Animação:** Apenas a parte inferior da "saia" do fantasma precisa mudar entre o Frame 1 e o Frame 2.

### B. Estado Bravo / Angry (4 Direções × 2 Frames)
Quando o Pac-Man está a menos de 4.5 blocos de distância, os fantasmas mudam de expressão para **Angry** (sobrancelhas franzidas e boca em ziguezague).
1. **Bravo Olhando para a Esquerda** (Frame 1 e Frame 2)
2. **Bravo Olhando para a Direita** (Frame 1 e Frame 2)
3. **Bravo Olhando para Cima** (Frame 1 e Frame 2)
4. **Bravo Olhando para Baixo** (Frame 1 e Frame 2)

### C. Estado Assustado / Frightened (Poder Ativo)
Quando o Pac-Man come uma pastilha de poder, os fantasmas ficam vulneráveis e mudam de cor.
* **Azul Escuro (Assustado):** 2 frames de animação (para movimento da base).
* **Branco/Piscando (Final do Efeito):** 2 frames de animação.
> No Pac-Man original, os fantasmas assustados não olham para direções específicas (os olhos viram pupilas vermelhas centralizadas). Se desejar simplificar, você só precisa de **4 imagens no total** para este estado (2 azuis e 2 brancas).

### D. Estado Morto / Dead (Apenas Olhos)
Quando o fantasma é comido, apenas seus olhos retornam para a base.
1. **Olhos olhando para a Esquerda**
2. **Olhos olhando para a Direita**
3. **Olhos olhando para Cima**
4. **Olhos olhando para Baixo**
> *Observação: Estas imagens não precisam ter o corpo do fantasma, apenas os globos oculares e as pupilas flutuando na transparência.*

### E. Estado de Impacto / Tontura (Cinemática de Colisão)
O jogo possui um efeito especial quando o fantasma é atingido/nocauteado (ele gira, cresce e viaja até o spawn).
* **1 Sprite de Tontura:** Corpo vermelho, olhos em formato de **"X"** e boca triste/curvada.

---

## 3. Resumo da Lista de Arquivos (Checklist para Desenho)

Aqui está a lista de assets que você precisará desenhar para **cada fantasma individual** (Blinky, Pinky, Inky, Clyde):

```
📁 [Nome do Fantasma] (ex: blinky)
 ├── 📄 normal_left_1.png
 ├── 📄 normal_left_2.png
 ├── 📄 normal_right_1.png
 ├── 📄 normal_right_2.png
 ├── 📄 normal_up_1.png
 ├── 📄 normal_up_2.png
 ├── 📄 normal_down_1.png
 ├── 📄 normal_down_2.png
 ├── 📄 angry_left_1.png
 ├── 📄 angry_left_2.png
 ├── 📄 angry_right_1.png
 ├── 📄 angry_right_2.png
 ├── 📄 angry_up_1.png
 ├── 📄 angry_up_2.png
 ├── 📄 angry_down_1.png
 └── 📄 angry_down_2.png
```

E os assets **compartilhados** (comuns para todos os fantasmas):

```
📁 ghosts_shared
 ├── 📄 scared_blue_1.png      (Fantasma assustado azul)
 ├── 📄 scared_blue_2.png
 ├── 📄 scared_white_1.png     (Fantasma assustado piscando em branco)
 ├── 📄 scared_white_2.png
 ├── 📄 dead_left.png          (Apenas olhos)
 ├── 📄 dead_right.png
 ├── 📄 dead_up.png
 ├── 📄 dead_down.png
 └── 📄 hit_stun.png           (Estado de tontura com olhos em X)
```

---

## 4. O que acontece com os Fantasmas Especiais (Mario & Michael Jackson)?

O jogo possui dois fantasmas especiais que usam acessórios. Você tem duas opções de design para eles:

1. **Acessórios Separados (Recomendado para flexibilidade):**
   Desenhe os acessórios em imagens transparentes de $64 \times 64$ px. O jogo continuará sobrepondo-os dinamicamente ao topo do sprite do fantasma.
   * **Acessórios Mario:** Chapéu Vermelho (Quepe) e Bigode.
   * **Acessórios Michael Jackson:** Chapéu Fedora Preto e Luva Brilhante.
2. **Sprites Dedicados (Recomendado para melhor estética):**
   Desenhar folhas de sprites exclusivas para estes dois personagens especiais com os chapéus e acessórios já integrados diretamente na ilustração.

---

## 5. Como faremos a substituição no código?

Uma vez que você tenha desenhado os sprites, faremos as seguintes alterações no arquivo `js/pacman.js`:
1. Criaremos uma função para pré-carregar (preload) todas as imagens PNG dos fantasmas ao iniciar o jogo.
2. Na função `drawSimpleGhost` e no loop de renderização dos fantasmas, substituiremos as chamadas de desenho vetorial canvas (`getGhostBodySprite` e `drawGhostFace`) por chamadas que desenham a imagem PNG correta baseada no estado (`gh.dir`, `state`, `frameIndex`).
