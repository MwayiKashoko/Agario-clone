const pi = Math.PI;
const e = Math.E;
const colors = ["red", "green", "blue", "orange", "gray", "yellow", "purple", "brown", "cyan", "pink", "gold", "lime", "turquoise", "teal", "navy", "magenta", "indigo", "tan", "silver"];

function randomInt(min, max) {
	return Math.floor(Math.random() * (max-min+1))+min;
}

function dist(x1, y1, x2, y2) {
	return Math.sqrt((x1-x2)**2+(y1-y2)**2);
}

function canDraw(thing) {
	if (thing == player) {
		return true;
	}

	return thing.x+thing.r > player.x-(width/2)/totalScaled && thing.x-thing.r < player.x+(width/2)/totalScaled && thing.y+thing.r > player.y-(height/2)/totalScaled && thing.y-thing.r < player.y+(height/2)/totalScaled;
}

function Cell(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.color = colors[randomInt(0, colors.length-1)];
	this.closestFood = null;
	this.closestCell = null;
	this.closestLargeCell = null;
	this.speed = 2;
	this.trackingCell = false;
	this.avoidingCell = false;
}

Cell.prototype.drawCell = function() {
	graphics.fillStyle = this.color;
	graphics.beginPath();
	graphics.arc(this.x, this.y, this.r, 0, pi*2);
	graphics.closePath();
	graphics.fill();

	if (this == player) {
		graphics.fillStyle = "white";
		graphics.textAlign = "center";
		graphics.font = `${textSize}px sans-serif`;
		graphics.fillText(player.r.toFixed(2), player.x, player.y+textSize/4);
	}
}

Cell.prototype.collides = function(object) {
	return dist(this.x, this.y, object.x, object.y) < this.r+object.r;
}

Cell.prototype.ejectMass = function(velX, velY) {
	if (parseInt(this.r) > 10) {
		this.r -= 3;

		graphics.translate(startingX-shiftedX, startingY-shiftedY);
		graphics.scale(1+1/100, 1+1/100);
		graphics.translate(shiftedX-startingX, shiftedY-startingY);

		totalScaled *= 1+1/100;

		mass.push(new Mass(this.x, this.y, 3, this.r, velX, velY, this.color));
	}
}

Cell.prototype.trackFood = function() {
	let closestDistance = dist(this.x, this.y, food[0].x, food[0].y);

	for (let i = 0; i < food.length; i++) {
		const distance = dist(this.x, this.y, food[i].x, food[i].y);

		if (distance < closestDistance) {
			closestDistance = distance;
			this.closestFood = food[i];
		}
	}
}

Cell.prototype.chaseFood = function() {
	const tan = Math.atan2(this.closestFood.y-this.y, this.closestFood.x-this.x);
	const xDir = Math.cos(tan);
	const yDir = Math.sin(tan);

	this.x += xDir*this.speed;
	this.y += yDir*this.speed;
}

Cell.prototype.trackCell = function() {
	let closestDistance = dist(this.x, this.y, cells[0].x, cells[0].y);
	let invalidCells = 0;

	if (this == bots[0]) {
		closestDistance = dist(this.x, this.y, cells[1].x, cells[1].y)
	}

	for (let i = 0; i < cells.length; i++) {
		if (this != cells[i]) {
			const distance = dist(this.x, this.y, cells[i].x, cells[i].y);

			if (distance < closestDistance && this.r > cells[i].r*1.25 && distance < (width/2)*(Math.log(e*this.r/15))) {
				closestDistance = distance;
				this.closestCell = cells[i];
			}

			if (this.r <= cells[i].r*1.25) {
				invalidCells++;
			}
		}
	}

	if (this.closestCell != null && (this.r <= this.closestCell.r*1.25 || invalidCells == cells.length-1)) {
		this.closestCell = null;
	}

	if (this.closestCell != null) {
		this.trackingCell = true;
	} else {
		this.trackingCell = false;
	}
}

Cell.prototype.chaseCell = function() {
	if (this.closestCell != null) {
		const tan = Math.atan2(this.closestCell.y-this.y, this.closestCell.x-this.x);
		const xDir = Math.cos(tan);
		const yDir = Math.sin(tan);

		this.x += xDir*this.speed;
		this.y += yDir*this.speed;
	}
}

Cell.prototype.setAvoidCell = function() {
	let closestDistance = dist(this.x, this.y, cells[0].x, cells[0].y);
	let invalidCells = 0;

	if (this == bots[0]) {
		closestDistance = dist(this.x, this.y, cells[1].x, cells[1].y)
	}

	for (let i = 0; i < cells.length; i++) {
		if (this != cells[i]) {
			const distance = dist(this.x, this.y, cells[i].x, cells[i].y);

			if (distance < closestDistance && this.r*1.25 < cells[i].r && distance < (width/2)*(Math.log(e*this.r/15))) {
				closestDistance = distance;
				this.closestLargeCell = cells[i];
			}

			if (this.r*1.25 >= cells[i].r || distance >= 200) {
				invalidCells++;
			}
		}
	}

	if (this.closestLargeCell != null && (this.r >= this.closestLargeCell.r*1.25 || invalidCells == cells.length-1)) {
		this.closestLargeCell = null;
	}

	if (this.closestLargeCell != null) {
		this.avoidingCell = true;
	} else {
		this.avoidingCell = false;
	}
}

Cell.prototype.avoidCell = function() {
	if (this.closestLargeCell != null) {
		const tan = Math.atan2(this.closestLargeCell.y-this.y, this.closestLargeCell.x-this.x);
		const xDir = Math.cos(tan);
		const yDir = Math.sin(tan);

		this.x -= xDir*this.speed;
		this.y -= yDir*this.speed;
	}
}

Cell.prototype.eatCell = function(cell) {
	return dist(this.x, this.y, cell.x, cell.y) < this.r && this.r > cell.r*1.25;
}

Cell.prototype.constrain = function() {
	if (this.x-this.r < xMin) {
		this.x = xMin+this.r
	} else if (this.x+this.r > xMax) {
		this.x = xMax-this.r
	}

	else if (this.y-this.r < yMin) {
		this.y = yMin+this.r;
	} else if (this.y+this.r > yMax) {
		this.y = yMax-this.r;
	}

	if (this.r < 15) {
		this.r = 15;
	} else if (this.r > 250) {
		this.r = 250;
	}
}

Cell.prototype.decay = function() {
	const amount = 0.005

	if (this.r > 15) {
		this.r *= 1-amount;
	}

	if (this == player) {
		graphics.translate(startingX-shiftedX, startingY-shiftedY);
		graphics.scale(1+amount/foodScale, 1+amount/foodScale);
		graphics.translate(shiftedX-startingX, shiftedY-startingY);


		totalScaled *= 1+amount/foodScale;		
	}
}

function Mass(x, y, r, playerR, velX, velY, color) {
	this.x = x + playerR * multX * Math.cos(Math.atan((mouseY/mouseX)));
	this.y = y + playerR * multY * Math.sin(Math.atan(mouseY/mouseX));
	this.r = r;
	this.velX = velX;
	this.velY = velY;
	this.velXSign = Math.sign(this.velX);
	this.velYSign = Math.sign(this.velY);
	this.color = color;
	this.duration = .5;
}

Mass.prototype.drawMass = function() {
	graphics.fillStyle = this.color;
	graphics.beginPath();
	graphics.arc(this.x, this.y, this.r, 0, pi*2);
	graphics.closePath();
	graphics.fill();
}

Mass.prototype.update = function() {
	if (this.x-this.r < xMin) {
		this.x = xMin+this.r;
	} else if (this.x+this.r > xMax) {
		this.x = xMax-this.r;
	}

	if (this.y-this.r < yMin) {
		this.y = yMin+this.r;
	} else if (this.y+this.r > yMax) {
		this.y = yMax-this.r;
	}

	if (this.velXSign == 1 && this.x-this.r < xMax) {
		this.x += this.velX;
	} else if (this.velXSign == -1 && this.x+this.r > xMin) {
		this.x += this.velX
	}

	if (this.velYSign == 1 && this.y-this.r < yMax) {
		this.y += this.velY;
	} else if (this.velYSign == -1 && this.y+this.r > yMin) {
		this.y += this.velY;
	}

	if (this.velXSign == 1 && this.velX > 0) {
		this.velX -= this.duration;
	} else if (this.velXSign == -1 && this.velX < 0) {
		this.velX += this.duration;
	} else {
		this.velX = 0;
	}

	if (this.velYSign == 1 && this.velY > 0) {
		this.velY -= this.duration;
	} else if (this.velYSign == -1 && this.velY < 0) {
		this.velY += this.duration;
	} else {
		this.velY = 0;
	}
}

Mass.prototype.collides = function(object) {
	return dist(this.x, this.y, object.x, object.y) < this.r;
}

function Food(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.color = colors[randomInt(0, colors.length-1)];
}

Food.prototype.drawFood = function() {
	graphics.fillStyle = this.color;
	graphics.beginPath();
	graphics.arc(this.x, this.y, this.r, 0, pi*2);
	graphics.closePath();
	graphics.fill();
}

Food.prototype.collides = function(object) {
	return dist(this.x, this.y, object.x, object.y) < this.r;
}