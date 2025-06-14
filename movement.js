let enPassantInfo = null;

export function setEnPassantInfo(info) {
    enPassantInfo = info;
}

export function getEnPassantInfo() {
    return enPassantInfo;
}

export function calculateValidMoves(piece, getCellAt) {
    const type = piece.dataset.type;
    const color = piece.dataset.color;
    const cell = piece.parentElement;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const calculators = {
        pawn: calculatePawnMoves,
        knight: calculateKnightMoves,
        bishop: calculateBishopMoves,
        rook: calculateRookMoves,
        queen: calculateQueenMoves,
        king: calculateKingMoves
    };

    const fn = calculators[type];
    return fn ? fn(row, col, color, getCellAt) : [];
}

function calculatePawnMoves(row, col, color, getCellAt) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    const newRow = row + direction;
    if (newRow >= 0 && newRow <= 7) {
        const targetCell = getCellAt(newRow, col);
        if (!targetCell.querySelector('.piece')) {
            moves.push({ row: newRow, col });
            if (row === startRow) {
                const doubleRow = row + direction * 2;
                const doubleCell = getCellAt(doubleRow, col);
                if (doubleCell && !doubleCell.querySelector('.piece')) {
                    moves.push({ row: doubleRow, col });
                }
            }
        }
    }

    [-1, 1].forEach(offset => {
        const captureCol = col + offset;
        const captureRow = row + direction;
        if (captureCol >= 0 && captureCol <= 7 && captureRow >= 0 && captureRow <= 7) {
            const targetCell = getCellAt(captureRow, captureCol);
            const targetPiece = targetCell.querySelector('.piece');
            if (targetPiece && targetPiece.dataset.color !== color) {
                moves.push({ row: captureRow, col: captureCol });
            }
        }
    });

    if (enPassantInfo && enPassantInfo.color !== color) {
        if (enPassantInfo.row === row && Math.abs(enPassantInfo.col - col) === 1) {
            const targetRow = enPassantInfo.captureRow;
            const targetCol = enPassantInfo.col;
            if (targetRow === row + direction) {
                const targetCell = getCellAt(targetRow, targetCol);
                if (targetCell && !targetCell.querySelector('.piece')) {
                    moves.push({ row: targetRow, col: targetCol });
                }
            }
        }
    }

    return moves;
}

function calculateKnightMoves(row, col, color, getCellAt) {
    const moves = [];
    const offsets = [
        { row: -2, col: -1 }, { row: -2, col: 1 },
        { row: -1, col: -2 }, { row: -1, col: 2 },
        { row: 1, col: -2 }, { row: 1, col: 2 },
        { row: 2, col: -1 }, { row: 2, col: 1 }
    ];

    offsets.forEach(move => {
        const newRow = row + move.row;
        const newCol = col + move.col;
        if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) return;
        const targetCell = getCellAt(newRow, newCol);
        const targetPiece = targetCell.querySelector('.piece');
        if (!targetPiece || targetPiece.dataset.color !== color) {
            moves.push({ row: newRow, col: newCol });
        }
    });
    return moves;
}

function calculateBishopMoves(row, col, color, getCellAt) {
    const moves = [];
    const directions = [
        { row: -1, col: -1 }, { row: -1, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 1 }
    ];

    directions.forEach(dir => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dir.row * i;
            const newCol = col + dir.col * i;
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
            const targetCell = getCellAt(newRow, newCol);
            const targetPiece = targetCell.querySelector('.piece');
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (targetPiece.dataset.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });
    return moves;
}

function calculateRookMoves(row, col, color, getCellAt) {
    const moves = [];
    const directions = [
        { row: -1, col: 0 }, { row: 1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 1 }
    ];

    directions.forEach(dir => {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dir.row * i;
            const newCol = col + dir.col * i;
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
            const targetCell = getCellAt(newRow, newCol);
            const targetPiece = targetCell.querySelector('.piece');
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (targetPiece.dataset.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    });
    return moves;
}

function calculateQueenMoves(row, col, color, getCellAt) {
    return [
        ...calculateRookMoves(row, col, color, getCellAt),
        ...calculateBishopMoves(row, col, color, getCellAt)
    ];
}

function calculateKingMoves(row, col, color, getCellAt) {
    const moves = [];
    const directions = [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
    ];

    directions.forEach(dir => {
        const newRow = row + dir.row;
        const newCol = col + dir.col;
        if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) return;
        const targetCell = getCellAt(newRow, newCol);
        const targetPiece = targetCell.querySelector('.piece');
        if (!targetPiece || targetPiece.dataset.color !== color) {
            moves.push({ row: newRow, col: newCol });
        }
    });
    return moves;
}
