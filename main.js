import { calculateValidMoves, setEnPassantInfo, getEnPassantInfo } from './movement.js';

document.addEventListener('DOMContentLoaded', () => {
    let selectedPiece = null;
    let validMoves = [];
    let currentTurn = 'white';
    let moveCount = 0;
    let pgnMoves = [];

    const board = document.getElementById('chessBoard');
    const gameLog = document.getElementById('gameLog');
    const turnIndicator = document.getElementById('turnIndicator');
    const newGameBtn = document.getElementById('newGameBtn');

    const pieceSymbols = {
        pawn: '♟',
        rook: '♜',
        knight: '♞',
        bishop: '♝',
        queen: '♛',
        king: '♚'
    };

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

        const piece = document.createElement('div');
        piece.className = `piece ${color}`;
        piece.dataset.type = type;
        piece.dataset.color = color;

        const symbol = pieceSymbols[type];
        piece.textContent = color === 'white'
            ? String.fromCharCode(symbol.charCodeAt(0) - 6)
            : symbol;

        cell.appendChild(piece);
    }

    function getCellAt(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }

    function handleCellClick(event) {
        const cell = event.currentTarget;

        if (selectedPiece) {
            const targetCell = event.currentTarget;
            const isValidMove = validMoves.some(move =>
                move.row === parseInt(targetCell.dataset.row) &&
                move.col === parseInt(targetCell.dataset.col)
            );

            if (isValidMove) {
                movePiece(selectedPiece, cell);
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

    function movePiece(piece, targetCell) {
        const sourceCell = piece.parentElement;
        const sourceRow = parseInt(sourceCell.dataset.row);
        const sourceCol = parseInt(sourceCell.dataset.col);
        const targetRow = parseInt(targetCell.dataset.row);
        const targetCol = parseInt(targetCell.dataset.col);

        let capturedPiece = targetCell.querySelector('.piece');
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

        targetCell.appendChild(piece);
        logMove(piece, sourceRow, sourceCol, targetRow, targetCol, capturedPiece);

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
    }

    function handleCapture(attackingPiece, capturedPiece) {
        capturedPiece.remove();
    }

    function logMove(piece, fromRow, fromCol, toRow, toCol, capturedPiece) {
        const pieceType = piece.dataset.type;
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
        if (pieceType === 'pawn') {
            notation = capturedPiece ? `${fromSquare[0]}x${toSquare}` : toSquare;
        } else {
            notation = pieceNotation + (capturedPiece ? 'x' : '') + toSquare;
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
        initializeBoard();
        gameLog.innerHTML = '<p>Game started. White to move.</p>';
        updatePgnLog();
    });

    initializeBoard();
    updatePgnLog();
});

