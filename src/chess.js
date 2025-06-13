class Chess {
  constructor() {
    this.reset();
  }

  reset() {
    // Board is 8x8 array. Uppercase = white, lowercase = black.
    this.board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    this.turn = 'w';
    this.castling = { w: {k: true, q: true}, b: {k: true, q: true} };
    this.enPassant = null; // square eligible for en passant capture
    this.halfmove = 0;
    this.fullmove = 1;
    this.history = [];
  }

  pieceColor(piece) {
    return piece === piece.toUpperCase() ? 'w' : 'b';
  }

  inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  cloneBoard(board) {
    return board.map(row => row.slice());
  }

  squareToAlgebraic(r, c) {
    return String.fromCharCode('a'.charCodeAt(0) + c) + (8 - r);
  }

  algebraicToSquare(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1], 10);
    return { r: rank, c: file };
  }

  getPiece(r, c) {
    if (!this.inBounds(r, c)) return null;
    return this.board[r][c];
  }

  setPiece(r, c, piece) {
    if (this.inBounds(r, c)) this.board[r][c] = piece;
  }

  isEmpty(r, c) {
    return this.getPiece(r, c) === null;
  }

  isEnemy(r, c, color) {
    const p = this.getPiece(r, c);
    return p && this.pieceColor(p) !== color;
  }

  // Generate pseudo-legal moves for a piece
  generateMovesForPiece(r, c) {
    const piece = this.getPiece(r, c);
    if (!piece) return [];
    const color = this.pieceColor(piece);
    const moves = [];
    const dir = color === 'w' ? -1 : 1;

    switch (piece.toLowerCase()) {
      case 'p':
        // one forward
        if (this.isEmpty(r + dir, c)) {
          moves.push({ r: r + dir, c });
          // two forward from starting rank
          const startRank = color === 'w' ? 6 : 1;
          if (r === startRank && this.isEmpty(r + dir * 2, c)) {
            moves.push({ r: r + dir * 2, c, special: 'double' });
          }
        }
        // captures
        for (let dc of [-1, 1]) {
          const nr = r + dir;
          const nc = c + dc;
          if (this.inBounds(nr, nc)) {
            if (this.isEnemy(nr, nc, color)) {
              moves.push({ r: nr, c: nc });
            }
            // en passant
            if (this.enPassant && this.enPassant.r === nr && this.enPassant.c === nc) {
              moves.push({ r: nr, c: nc, special: 'enpassant' });
            }
          }
        }
        break;
      case 'r':
        this.generateSliding(r, c, color, moves, [[1,0],[-1,0],[0,1],[0,-1]]);
        break;
      case 'b':
        this.generateSliding(r, c, color, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case 'q':
        this.generateSliding(r, c, color, moves, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case 'n':
        const knightMoves = [[1,2],[2,1],[-1,2],[2,-1],[-2,1],[1,-2],[-1,-2],[-2,-1]];
        for (let [dr, dc] of knightMoves) {
          const nr = r + dr, nc = c + dc;
          if (this.inBounds(nr, nc) && (!this.getPiece(nr, nc) || this.isEnemy(nr, nc, color))) {
            moves.push({ r: nr, c: nc });
          }
        }
        break;
      case 'k':
        const kingMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        for (let [dr, dc] of kingMoves) {
          const nr = r + dr, nc = c + dc;
          if (this.inBounds(nr, nc) && (!this.getPiece(nr, nc) || this.isEnemy(nr, nc, color))) {
            moves.push({ r: nr, c: nc });
          }
        }
        // castling
        if (!this.inCheck(color) && ((color === 'w' && r === 7) || (color === 'b' && r === 0))) {
          if (this.castling[color].k && this.isEmpty(r, 5) && this.isEmpty(r,6) &&
              !this.squareAttacked(r,5,color) && !this.squareAttacked(r,6,color)) {
            moves.push({ r, c: 6, special: 'castle-k' });
          }
          if (this.castling[color].q && this.isEmpty(r,1) && this.isEmpty(r,2) && this.isEmpty(r,3) &&
              !this.squareAttacked(r,2,color) && !this.squareAttacked(r,3,color)) {
            moves.push({ r, c: 2, special: 'castle-q' });
          }
        }
        break;
    }
    return moves;
  }

  generateSliding(r, c, color, moves, directions) {
    for (let [dr, dc] of directions) {
      let nr = r + dr, nc = c + dc;
      while (this.inBounds(nr, nc)) {
        if (!this.getPiece(nr, nc)) {
          moves.push({ r: nr, c: nc });
        } else {
          if (this.isEnemy(nr, nc, color)) moves.push({ r: nr, c: nc });
          break;
        }
        nr += dr; nc += dc;
      }
    }
  }

  // Determine if a square is attacked by opponent
  squareAttacked(r, c, color) {
    const opp = color === 'w' ? 'b' : 'w';
    // check all opponent moves if they include this square
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const p = this.getPiece(i, j);
        if (p && this.pieceColor(p) === opp) {
          const moves = this.generateMovesForPiece(i, j);
          if (moves.some(m => m.r === r && m.c === c)) return true;
        }
      }
    }
    return false;
  }

  inCheck(color) {
    // find king
    for (let i=0;i<8;i++) {
      for (let j=0;j<8;j++) {
        const p = this.getPiece(i,j);
        if(p && p.toLowerCase() === 'k' && this.pieceColor(p) === color) {
          return this.squareAttacked(i,j,color);
        }
      }
    }
    return false;
  }

  legalMovesForPiece(r,c) {
    const piece = this.getPiece(r,c);
    if(!piece || this.pieceColor(piece) !== this.turn) return [];
    const moves = this.generateMovesForPiece(r,c);
    // filter out moves that leave own king in check
    const legal = [];
    for(const m of moves) {
      const snapshot = this.saveState();
      this.makeMoveInternal({r,c}, m, true);
      const inCheck = this.inCheck(this.turn);
      this.restoreState(snapshot);
      if(!inCheck) legal.push(m);
    }
    return legal;
  }

  saveState() {
    return {
      board: this.cloneBoard(this.board),
      turn: this.turn,
      castling: JSON.parse(JSON.stringify(this.castling)),
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfmove: this.halfmove,
      fullmove: this.fullmove
    };
  }

  restoreState(state) {
    this.board = this.cloneBoard(state.board);
    this.turn = state.turn;
    this.castling = JSON.parse(JSON.stringify(state.castling));
    this.enPassant = state.enPassant ? { ...state.enPassant } : null;
    this.halfmove = state.halfmove;
    this.fullmove = state.fullmove;
  }

  makeMoveInternal(from, to, simulate=false) {
    const piece = this.getPiece(from.r, from.c);
    const color = this.pieceColor(piece);
    const target = this.getPiece(to.r, to.c);
    // handle special moves
    this.enPassant = null;
    if(piece.toLowerCase() === 'p') {
      if(to.special === 'enpassant') {
        const dir = color === 'w' ? 1 : -1;
        this.setPiece(to.r + dir, to.c, null);
      }
      if(Math.abs(to.r - from.r) === 2) {
        this.enPassant = { r: (from.r + to.r)/2, c: from.c };
      }
      if((color === 'w' && to.r === 0) || (color === 'b' && to.r === 7)) {
        // promote to queen
        this.setPiece(from.r, from.c, null);
        this.setPiece(to.r, to.c, color === 'w' ? 'Q' : 'q');
      } else {
        this.setPiece(from.r, from.c, null);
        this.setPiece(to.r, to.c, piece);
      }
    } else if(piece.toLowerCase() === 'k' && (to.special === 'castle-k' || to.special === 'castle-q')) {
      const rookCol = to.special === 'castle-k' ? 7 : 0;
      const newRookCol = to.special === 'castle-k' ? 5 : 3;
      const rook = this.getPiece(from.r, rookCol);
      this.setPiece(from.r, from.c, null);
      this.setPiece(to.r, to.c, piece);
      this.setPiece(from.r, rookCol, null);
      this.setPiece(from.r, newRookCol, rook);
      this.castling[color].k = false;
      this.castling[color].q = false;
    } else {
      this.setPiece(from.r, from.c, null);
      this.setPiece(to.r, to.c, piece);
      if(piece.toLowerCase() === 'k') {
        this.castling[color].k = false;
        this.castling[color].q = false;
      }
      if(piece.toLowerCase() === 'r') {
        if(from.c === 0) this.castling[color].q = false;
        if(from.c === 7) this.castling[color].k = false;
      }
    }
    if(target || piece.toLowerCase() === 'p') this.halfmove = 0; else this.halfmove++;
    if(color === 'b') this.fullmove++;
    if(!simulate) {
      this.turn = color === 'w' ? 'b' : 'w';
    }
  }

  move(from, to) {
    const legal = this.legalMovesForPiece(from.r, from.c);
    const move = legal.find(m => m.r === to.r && m.c === to.c && m.special === to.special);
    if(!move) return false;
    this.makeMoveInternal(from, move);
    this.history.push(`${this.squareToAlgebraic(from.r, from.c)}-${this.squareToAlgebraic(move.r, move.c)}`);
    return true;
  }

  allLegalMoves(color = this.turn) {
    const moves = [];
    for(let r=0;r<8;r++) {
      for(let c=0;c<8;c++) {
        const p = this.getPiece(r,c);
        if(p && this.pieceColor(p) === color) {
          const pieceMoves = this.legalMovesForPiece(r,c);
          for(const m of pieceMoves) {
            moves.push({from:{r,c},to:m});
          }
        }
      }
    }
    return moves;
  }

  isCheckmate(color=this.turn) {
    if(!this.inCheck(color)) return false;
    return this.allLegalMoves(color).length === 0;
  }

  isStalemate(color=this.turn) {
    if(this.inCheck(color)) return false;
    return this.allLegalMoves(color).length === 0;
  }
}

export default Chess;
