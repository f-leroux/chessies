import { calculateValidMoves, setEnPassantInfo, getEnPassantInfo } from './movement.js';
import createEngine from './engine/createEngine.js';

document.addEventListener('DOMContentLoaded', () => {
    let selectedPiece = null;
    let validMoves = [];
    let currentTurn = 'white';
    let moveCount = 0;
    let pgnMoves = [];
    let aiEnabled = false;
    let aiLevel = 5;
    let engine = null;

    const board = document.getElementById('chessBoard');
    const gameLog = document.getElementById('gameLog');
    const turnIndicator = document.getElementById('turnIndicator');
    const newGameBtn = document.getElementById('newGameBtn');
    const playAIBtn = document.getElementById('playAIBtn');
    const aiLevelSelect = document.getElementById('aiLevel');
    const promotionModal = document.getElementById('promotionModal');
    const promotionButtons = promotionModal.querySelectorAll('button');
    let promotionResolver = null;

    promotionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (promotionResolver) {
                promotionResolver(btn.dataset.piece);
                promotionResolver = null;
            }
            promotionModal.style.display = 'none';
        });
    });

    function choosePromotionPiece() {
        return new Promise(resolve => {
            promotionResolver = resolve;
            promotionModal.style.display = 'flex';
        });
    }

    const pieceImages = {
        white: {
            pawn: 'sprites/w_pawn.svg',
            rook: 'sprites/w_rook.svg',
            knight: 'sprites/w_knight.svg',
            bishop: 'sprites/w_bishop.svg',
            queen: 'sprites/w_queen.svg',
            king: 'sprites/w_king.svg'
        },
        black: {
            pawn: 'sprites/b_pawn.svg',
            rook: 'sprites/b_rook.svg',
            knight: 'sprites/b_knight.svg',
            bishop: 'sprites/b_bishop.svg',
            queen: 'sprites/b_queen.svg',
            king: 'sprites/b_king.svg'
        }
    };

    async function initEngine() {
        engine = createEngine();
        engine.postMessage('uci');
        engine.postMessage('setoption name Skill Level value ' + aiLevel);
    }

    function getBestMove(fen) {
        return new Promise(resolve => {
            const handler = e => {
                const text = typeof e.data === 'string' ? e.data : '';
                if (text.startsWith('bestmove')) {
                    engine.removeEventListener('message', handler);
                    resolve(text.split(' ')[1]);
                }
            };
            engine.addEventListener('message', handler);
            engine.postMessage('position fen ' + fen);
            engine.postMessage('go movetime 1000');
        });
    }

    function initializeBoard() {
        board.innerHTML = '';
        moveCount = 0;
        currentTurn = 'white';
        selectedPiece = null;
        validMoves = [];
        setEnPassantInfo(null);

        pgnMoves = [];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', handleCellClick);
                cell.addEventListener('dragover', handleDragOver);
                cell.addEventListener('drop', handleDrop);
                board.appendChild(cell);
            }
        }

        placePieces();
        updateTurnIndicator();
    }

    function placePieces() {
        const setupOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

        for (let col = 0; col < 8; col++) {
            createPiece('pawn', 'black', 1, col);
            createPiece('pawn', 'white', 6, col);
        }

        for (let col = 0; col < 8; col++) {
            createPiece(setupOrder[col], 'black', 0, col);
            createPiece(setupOrder[col], 'white', 7, col);
        }
    }

    function createPiece(type, color, row, col) {
        const cell = getCellAt(row, col);
        if (!cell) return;

        const piece = document.createElement('img');
        piece.classList.add('piece');
        piece.dataset.type = type;
        piece.dataset.color = color;
        piece.dataset.moved = 'false';
        piece.src = pieceImages[color][type];
        piece.alt = `${color} ${type}`;
        piece.draggable = true;
        piece.addEventListener('dragstart', handleDragStart);
        piece.addEventListener('dragend', handleDragEnd);

        cell.appendChild(piece);
    }

    function getCellAt(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    function isKingInCheck(color) {
        const king = document.querySelector(`.piece[data-type="king"][data-color="${color}"]`);
        if (!king) return false;
        const kingRow = parseInt(king.parentElement.dataset.row);
        const kingCol = parseInt(king.parentElement.dataset.col);
        const opponentColor = color === 'white' ? 'black' : 'white';
        const opponentPieces = document.querySelectorAll(`.piece[data-color="${opponentColor}"]`);

        for (const opPiece of opponentPieces) {
            const moves = calculateValidMoves(opPiece, getCellAt, true);
            if (moves.some(m => m.row === kingRow && m.col === kingCol)) {
                return true;
            }
        }
        return false;
    }

    function simulateMove(piece, targetCell) {
        const sourceCell = piece.parentElement;
        const capturedPiece = targetCell.querySelector('.piece');
        let castlingRook = null;
        let castlingTarget = null;
        let rookMovedBefore = null;
        const movedBefore = piece.dataset.moved;
        const enPassant = getEnPassantInfo();

        let enPassantCaptured = null;
        if (
            piece.dataset.type === 'pawn' &&
            !capturedPiece &&
            enPassant &&
            enPassant.color !== piece.dataset.color
        ) {
            const sourceRow = parseInt(sourceCell.dataset.row);
            const sourceCol = parseInt(sourceCell.dataset.col);
            const targetRow = parseInt(targetCell.dataset.row);
            const targetCol = parseInt(targetCell.dataset.col);
            if (
                sourceRow === enPassant.row &&
                targetRow === enPassant.captureRow &&
                targetCol === enPassant.col &&
                Math.abs(sourceCol - enPassant.col) === 1
            ) {
                enPassantCaptured = enPassant.piece;
                if (enPassantCaptured && enPassantCaptured.parentElement) {
                    enPassantCaptured.parentElement.removeChild(enPassantCaptured);
                }
            }
        }

        if (capturedPiece) targetCell.removeChild(capturedPiece);

        const sourceRowSim = parseInt(sourceCell.dataset.row);
        const sourceColSim = parseInt(sourceCell.dataset.col);
        const targetRowSim = parseInt(targetCell.dataset.row);
        const targetColSim = parseInt(targetCell.dataset.col);

        const isCastling =
            piece.dataset.type === 'king' &&
            Math.abs(targetColSim - sourceColSim) === 2;
        if (isCastling) {
            if (targetColSim === 6) {
                castlingRook = getCellAt(sourceRowSim, 7).querySelector('.piece');
                castlingTarget = getCellAt(sourceRowSim, 5);
            } else if (targetColSim === 2) {
                castlingRook = getCellAt(sourceRowSim, 0).querySelector('.piece');
                castlingTarget = getCellAt(sourceRowSim, 3);
            }
            if (castlingRook && castlingTarget) {
                rookMovedBefore = castlingRook.dataset.moved;
                castlingTarget.appendChild(castlingRook);
                castlingRook.dataset.moved = 'true';
            }
        }

        targetCell.appendChild(piece);
        piece.dataset.moved = 'true';

        return () => {
            sourceCell.appendChild(piece);
            if (capturedPiece) targetCell.appendChild(capturedPiece);
            if (enPassantCaptured) {
                const captureCell = getCellAt(
                    parseInt(enPassant.row),
                    parseInt(enPassant.col)
                );
                if (captureCell) captureCell.appendChild(enPassantCaptured);
            }
            if (castlingRook && castlingTarget) {
                const rookSource = targetColSim === 6 ? getCellAt(sourceRowSim, 7) : getCellAt(sourceRowSim, 0);
                rookSource.appendChild(castlingRook);
                castlingRook.dataset.moved = rookMovedBefore;
            }
            piece.dataset.moved = movedBefore;
        };
    }

    function filterMovesPreventCheck(piece, moves) {
        return moves.filter(move => {
            const targetCell = getCellAt(move.row, move.col);
            const undo = simulateMove(piece, targetCell);
            const inCheck = isKingInCheck(piece.dataset.color);
            undo();
            return !inCheck;
        });
    }

    function hasAnyValidMoves(color) {
        const pieces = document.querySelectorAll(`.piece[data-color="${color}"]`);
        for (const piece of pieces) {
            let moves = calculateValidMoves(piece, getCellAt);
            moves = filterMovesPreventCheck(piece, moves);
            if (moves.length > 0) return true;
        }
        return false;
    }

    async function handleCellClick(event) {
        const cell = event.currentTarget;

        if (selectedPiece) {
            const targetCell = event.currentTarget;
            const isValidMove = validMoves.some(move =>
                move.row === parseInt(targetCell.dataset.row) &&
                move.col === parseInt(targetCell.dataset.col)
            );

            if (isValidMove) {
                await movePiece(selectedPiece, cell);
            } else {
                const piece = cell.querySelector('.piece');
                if (piece && piece.dataset.color === currentTurn) {
                    clearSelection();
                    selectPiece(piece);
                } else {
                    clearSelection();
                }
            }
        } else {
            const piece = cell.querySelector('.piece');
            if (piece && piece.dataset.color === currentTurn) {
                selectPiece(piece);
            }
        }
    }

    function selectPiece(piece) {
        selectedPiece = piece;
        const cell = piece.parentElement;
        cell.classList.add('selected');
        validMoves = calculateValidMoves(piece, getCellAt);
        validMoves = filterMovesPreventCheck(piece, validMoves);
        validMoves.forEach(move => {
            const moveCell = getCellAt(move.row, move.col);
            if (moveCell) moveCell.classList.add('valid-move');
        });
    }

    function clearSelection() {
        if (selectedPiece) {
            selectedPiece.parentElement.classList.remove('selected');
            selectedPiece = null;
        }

        document.querySelectorAll('.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });

        validMoves = [];
        document.querySelectorAll('.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
    }

    function handleDragStart(event) {
        const piece = event.target;
        if (piece.dataset.color !== currentTurn) {
            event.preventDefault();
            return;
        }
        clearSelection();
        selectPiece(piece);
    }

    function handleDragEnd() {
        clearSelection();
    }

    function handleDragOver(event) {
        if (selectedPiece) {
            event.preventDefault();
        }
    }

    async function handleDrop(event) {
        event.preventDefault();
        if (!selectedPiece) return;
        const cell = event.currentTarget;
        const isValidMove = validMoves.some(
            move =>
                move.row === parseInt(cell.dataset.row) &&
                move.col === parseInt(cell.dataset.col)
        );
        if (isValidMove) {
            await movePiece(selectedPiece, cell);
        }
        clearSelection();
    }

    async function movePiece(piece, targetCell, promotionOverride = null) {
        const sourceCell = piece.parentElement;
        const sourceRow = parseInt(sourceCell.dataset.row);
        const sourceCol = parseInt(sourceCell.dataset.col);
        const targetRow = parseInt(targetCell.dataset.row);
        const targetCol = parseInt(targetCell.dataset.col);

        const originalType = piece.dataset.type;


        let capturedPiece = targetCell.querySelector('.piece');
        let castlingRook = null;
        const enPassant = getEnPassantInfo();
        const isEnPassant =
            piece.dataset.type === 'pawn' &&
            enPassant &&
            enPassant.color !== piece.dataset.color &&
            sourceRow === enPassant.row &&
            targetRow === enPassant.captureRow &&
            targetCol === enPassant.col &&
            Math.abs(sourceCol - enPassant.col) === 1;

        if (isEnPassant) {
            capturedPiece = enPassant.piece;
            if (capturedPiece) {
                handleCapture(piece, capturedPiece);
            }
        } else if (capturedPiece) {
            handleCapture(piece, capturedPiece);
        }

        const isCastling =
            piece.dataset.type === 'king' &&
            Math.abs(targetCol - sourceCol) === 2;
        if (isCastling) {
            if (targetCol === 6) {
                castlingRook = getCellAt(sourceRow, 7).querySelector('.piece');
                if (castlingRook) {
                    getCellAt(sourceRow, 5).appendChild(castlingRook);
                    castlingRook.dataset.moved = 'true';
                }
            } else if (targetCol === 2) {
                castlingRook = getCellAt(sourceRow, 0).querySelector('.piece');
                if (castlingRook) {
                    getCellAt(sourceRow, 3).appendChild(castlingRook);
                    castlingRook.dataset.moved = 'true';
                }
            }
        }

        targetCell.appendChild(piece);
        piece.dataset.moved = 'true';
        let promotionPiece = null;
        if (
            originalType === 'pawn' &&
            (targetRow === 0 || targetRow === 7)
        ) {
            if (promotionOverride) {
                promotionPiece = promotionOverride;
            } else {
                promotionPiece = await choosePromotionPiece();
            }
            promotePawn(piece, promotionPiece);
        }

        logMove(
            piece,
            sourceRow,
            sourceCol,
            targetRow,
            targetCol,
            capturedPiece,
            promotionPiece,
            originalType
        );

        setEnPassantInfo(null);
        if (
            piece.dataset.type === 'pawn' &&
            Math.abs(targetRow - sourceRow) === 2
        ) {
            setEnPassantInfo({
                row: targetRow,
                col: targetCol,
                captureRow:
                    targetRow + (piece.dataset.color === 'white' ? 1 : -1),
                color: piece.dataset.color,
                piece: piece
            });
        }

        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        moveCount++;
        updateTurnIndicator();
        checkGameEnd();

        sourceCell.classList.remove('selected');
        clearSelection();

        await maybeAIMove();
    }

    function handleCapture(attackingPiece, capturedPiece) {
        capturedPiece.remove();
    }

    function promotePawn(piece, newType = 'queen') {
        piece.dataset.type = newType;
        piece.src = pieceImages[piece.dataset.color][newType];
    }

    function logMove(
        piece,
        fromRow,
        fromCol,
        toRow,
        toCol,
        capturedPiece,
        promotionPiece,
        originalType
    ) {
        const pieceType = originalType || piece.dataset.type;
        const fromSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toSquare = String.fromCharCode(97 + toCol) + (8 - toRow);

        const pieceNotation = {
            pawn: '',
            knight: 'N',
            bishop: 'B',
            rook: 'R',
            queen: 'Q',
            king: 'K'
        }[pieceType] || '';

        let notation = '';
        if (
            pieceType === 'king' &&
            Math.abs(toCol - fromCol) === 2
        ) {
            notation = toCol === 6 ? 'O-O' : 'O-O-O';
        } else if (pieceType === 'pawn') {
            notation = capturedPiece
                ? `${fromSquare[0]}x${toSquare}`
                : toSquare;
        } else {
            notation = pieceNotation + (capturedPiece ? 'x' : '') + toSquare;
        }
        if (promotionPiece) {
            const promoNotation = {
                queen: 'Q',
                rook: 'R',
                bishop: 'B',
                knight: 'N'
            }[promotionPiece] || 'Q';
            notation += `=${promoNotation}`;
        }

        pgnMoves.push(notation);
        updatePgnLog();
    }

    function updatePgnLog() {
        let text = '';
        for (let i = 0; i < pgnMoves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = pgnMoves[i];
            const blackMove = pgnMoves[i + 1] || '';
            text += `${moveNumber}. ${whiteMove}`;
            if (blackMove) text += ` ${blackMove}`;
            if (i + 2 < pgnMoves.length) text += ' ';
        }
        gameLog.innerHTML = `<p>${text}</p>`;
    }

    function updateTurnIndicator() {
        turnIndicator.textContent = `${currentTurn[0].toUpperCase() + currentTurn.slice(1)}'s Turn`;
        turnIndicator.style.color = currentTurn === 'white' ? '#2c3e50' : '#000';
    }

    function checkGameEnd() {
        const whiteKing = document.querySelector('.piece[data-type="king"][data-color="white"]');
        const blackKing = document.querySelector('.piece[data-type="king"][data-color="black"]');

        if (!whiteKing) {
            gameLog.innerHTML += `<p>Game Over! Black wins by capturing the white king!</p>`;
            endGame('black');
        } else if (!blackKing) {
            gameLog.innerHTML += `<p>Game Over! White wins by capturing the black king!</p>`;
            endGame('white');
        } else {
            const inCheck = isKingInCheck(currentTurn);
            const hasMoves = hasAnyValidMoves(currentTurn);
            if (inCheck && !hasMoves) {
                const winner = currentTurn === 'white' ? 'black' : 'white';
                gameLog.innerHTML += `<p>Checkmate! ${winner[0].toUpperCase() + winner.slice(1)} wins!</p>`;
                endGame(winner);
            }
        }
    }

    function generateFEN() {
        const rows = [];
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            let rowStr = '';
            for (let c = 0; c < 8; c++) {
                const cell = getCellAt(r, c);
                const piece = cell.querySelector('.piece');
                if (piece) {
                    if (empty > 0) {
                        rowStr += empty;
                        empty = 0;
                    }
                    const map = { pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k' };
                    let ch = map[piece.dataset.type] || 'p';
                    if (piece.dataset.color === 'white') ch = ch.toUpperCase();
                    rowStr += ch;
                } else {
                    empty++;
                }
            }
            if (empty > 0) rowStr += empty;
            rows.push(rowStr);
        }

        const placement = rows.join('/');
        const turn = currentTurn === 'white' ? 'w' : 'b';
        const castlingRights = [];
        const wKing = document.querySelector('.piece[data-type="king"][data-color="white"]');
        if (wKing && wKing.dataset.moved !== 'true') {
            const wRookH = getCellAt(7, 7).querySelector('.piece');
            const wRookA = getCellAt(7, 0).querySelector('.piece');
            if (
                wRookH &&
                wRookH.dataset.type === 'rook' &&
                wRookH.dataset.color === 'white' &&
                wRookH.dataset.moved !== 'true'
            ) {
                castlingRights.push('K');
            }
            if (
                wRookA &&
                wRookA.dataset.type === 'rook' &&
                wRookA.dataset.color === 'white' &&
                wRookA.dataset.moved !== 'true'
            ) {
                castlingRights.push('Q');
            }
        }

        const bKing = document.querySelector('.piece[data-type="king"][data-color="black"]');
        if (bKing && bKing.dataset.moved !== 'true') {
            const bRookH = getCellAt(0, 7).querySelector('.piece');
            const bRookA = getCellAt(0, 0).querySelector('.piece');
            if (
                bRookH &&
                bRookH.dataset.type === 'rook' &&
                bRookH.dataset.color === 'black' &&
                bRookH.dataset.moved !== 'true'
            ) {
                castlingRights.push('k');
            }
            if (
                bRookA &&
                bRookA.dataset.type === 'rook' &&
                bRookA.dataset.color === 'black' &&
                bRookA.dataset.moved !== 'true'
            ) {
                castlingRights.push('q');
            }
        }

        const castling = castlingRights.length ? castlingRights.join('') : '-';
        const epInfo = getEnPassantInfo();
        const enPassant = epInfo
            ? String.fromCharCode(97 + parseInt(epInfo.col)) + (8 - parseInt(epInfo.captureRow))
            : '-';
        const halfmove = 0;
        const fullmove = Math.floor(moveCount / 2) + 1;
        return `${placement} ${turn} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
    }

    async function maybeAIMove() {
        if (!aiEnabled || currentTurn !== 'black') return;
        const fen = generateFEN();
        const best = await getBestMove(fen);
        if (!best) return;
        const fromCol = best.charCodeAt(0) - 97;
        const fromRow = 8 - parseInt(best[1]);
        const toCol = best.charCodeAt(2) - 97;
        const toRow = 8 - parseInt(best[3]);
        const promoMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
        const promo = best.length > 4 ? promoMap[best[4]] : null;
        const source = getCellAt(fromRow, fromCol);
        const piece = source.querySelector('.piece');
        const target = getCellAt(toRow, toCol);
        if (piece && target) {
            await movePiece(piece, target, promo);
        }
    }

    function endGame(winner) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.removeEventListener('click', handleCellClick);
        });

        turnIndicator.textContent = `Game Over! ${winner[0].toUpperCase() + winner.slice(1)} wins!`;
        turnIndicator.style.color = winner === 'white' ? '#2c3e50' : '#000';
    }

    newGameBtn.addEventListener('click', function() {
        aiEnabled = false;
        if (engine) {
            engine.terminate();
            engine = null;
        }
        initializeBoard();
        gameLog.innerHTML = '<p>Game started. White to move.</p>';
        updatePgnLog();
    });

    playAIBtn.addEventListener('click', async function() {
        aiEnabled = true;
        aiLevel = parseInt(aiLevelSelect.value, 10);
        await initEngine();
        initializeBoard();
        gameLog.innerHTML = '<p>Game started vs Stockfish. White to move.</p>';
        updatePgnLog();
    });

    initializeBoard();
    updatePgnLog();
});

