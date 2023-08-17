/*
To-Do later:
Add splitting, viruses, spawner cells and their mechanics

GENERAL:
Make border bigger and add more food
Make the canvas size the width and height of the player's screen

✓ add ejecting mass
✓ max cell size
✓ zooming in and out
✓ Add slowing down as the player gets bigger
✓ Constrain the player
✓ Zoom out when getting bigger
✓ Random starting location
✓ Make sure mass ejection can't escape the borders of the world
✓ Make sure the player stays in the screen at ALL times
✓ Add Score on player's body (only players own body and only if the player wants it)
✓ Replace all atan with atan2
✓ add bots
✓ Add eating bots (if large enough)
✓ Bots can eat player's mass
✓ Make size increase more balanced and smooth (too fast right now)
✓ Only draw things on screen when within the player's range (still need to do with food and bots)
*/

const canvas = document.getElementById("canvas");

//canvas.width = document.body.clientWidth;
//canvas.height = document.body.clientHeight;

canvas.width = document.documentElement.offsetWidth;
canvas.height = document.documentElement.scrollHeight;

const graphics = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const totalWidth = 5000;
const totalHeight = 5000;
const xMin = -totalWidth/2;
const xMax = totalWidth/2;
const yMin = -totalHeight/2;
const yMax = totalHeight/2;

let player = new Cell(randomInt(xMin+15, xMax-15), randomInt(yMin+15, yMax-15), 15);

const maxFood = 5000;
let food = [];
const massGainedFromFood = 20;
let foodScale = 5000;
const growthAmount = 30;
const maxMass = 300;

let mass = [];

//Testing where the mouse is with respect to the player
let mouseX = 100;
let mouseY = 0;

//where we are in the shifted plane
let shiftedX = 0;
let shiftedY = 0;

let startingX = player.x;
let startingY = player.y;

//player's speed
let originalSpeed = 100;
let speedLimit = 100;

let multX = 1;
let multY = 1;

let score = 0;

let textSize = 10;

const maxBots = 49;
let bots = [];

//Initializing the bots
for (let i = 0; i < maxBots; i++) {
	bots.push(new Cell(randomInt(xMin, xMax), randomInt(yMin, yMax), 15));
}

//Movement of the player
canvas.addEventListener("mousemove", function(mouse) {
	mouseX = mouse.offsetX-width/2;
	mouseY = mouse.offsetY-height/2;
});

const mouseZoom = 0.1
let scaled = 1;
let totalScaled = 1;

let time = 0;

//Literally go on a piece of paper and figure out the math to solve the zooming problem
canvas.addEventListener("wheel", function(wheel) {
	// < 0 means scrolling down > 0 means scrolling up
	if (wheel.wheelDelta < 0 && scaled > 1) {
		graphics.translate(startingX-shiftedX, startingY-shiftedY);
		graphics.scale(1-mouseZoom, 1-mouseZoom);
		graphics.translate(shiftedX-startingX, shiftedY-startingY);

		scaled *= 1-mouseZoom;
		totalScaled *= 1-mouseZoom;
	} else if (wheel.wheelDelta > 0 && scaled < 2) {
		graphics.translate(startingX-shiftedX, startingY-shiftedY);
		graphics.scale(1+mouseZoom, 1+mouseZoom);
		graphics.translate(shiftedX-startingX, shiftedY-startingY);

		scaled *= 1+mouseZoom;
		totalScaled *= 1+mouseZoom;
	}
})

let wPressed = false;

document.addEventListener("keydown", function(key) {
	if (!wPressed && key.keyCode == 87) {
		let tan = Math.atan2(mouseY, mouseX);

		player.ejectMass(10 * Math.cos(tan), 10 * Math.sin(tan));

		wPressed = true;
	}
});

document.addEventListener("keyup", function(key) {
	if (key.keyCode == 87) {
		wPressed = false;
	}
});

//initializing all the food food radius should normall be between 3 and 5
for (let i = 0; i < maxFood; i++) {
	food.push(new Food(randomInt(xMin, xMax), randomInt(yMin, yMax), randomInt(3, 5)));
}

//Translating to make it easier to deal with; The normal position of the plane (0, 0) at the center
graphics.translate(width/2-player.x, height/2-player.y);

//every cell in the game
let cells = [];
//cells sorted by radius
let sortedCells = [];

for (let i = 0; i < bots.length; i++) {
	cells.push(bots[i]);
	sortedCells.push(bots[i]);
}

cells.push(player);
sortedCells.push(player);

function draw() {
	graphics.clearRect(-totalWidth, -totalHeight, totalWidth*2, totalHeight*2);

	//all stuff to do with the food
	for (let i = 0; i < food.length; i++) {
		if (canDraw(food[i])) {
			food[i].drawFood();

			if (player.collides(food[i])) {
				if (player.r < maxMass) {
					player.r += food[i].r/(massGainedFromFood*player.r/growthAmount);

					graphics.translate(startingX-shiftedX, startingY-shiftedY);
					graphics.scale(1-food[i].r/foodScale, 1-food[i].r/foodScale);
					graphics.translate(shiftedX-startingX, shiftedY-startingY);

					totalScaled *= 1-food[i].r/foodScale;
				}

				food[i].x = randomInt(xMin, xMax);
				food[i].y = randomInt(yMin, yMax);
				food[i].r = randomInt(3, 5);
				food[i].color = colors[randomInt(0, colors.length-1)];
			}
		}
	}

	//all stuff to do with the mass
	for (let i = 0; i < mass.length; i++) {
		mass[i].update();

		if (canDraw(mass[i])) {
			mass[i].drawMass();

			if (player.collides(mass[i])) {
				if (player.r < maxMass) {
					player.r += mass[i].r/1.4;

					graphics.translate(startingX-shiftedX, startingY-shiftedY);
					graphics.scale(1-mass[i].r/foodScale, 1-mass[i].r/foodScale);
					graphics.translate(shiftedX-startingX, shiftedY-startingY);

					totalScaled *= 1-mass[i].r/foodScale;
				}

				mass.splice(i, 1);
			}
		}
	}

	//all stuff to do with the bots
	for (let i = 0; i < bots.length; i++) {
		bots[i].constrain();

		if (!bots[i].avoidingCell) {
			if (!bots[i].trackingCell) {
				bots[i].trackFood();
				bots[i].chaseFood();
			}

			bots[i].trackCell();
			bots[i].chaseCell();
		}

		bots[i].setAvoidCell();
		bots[i].avoidCell();

		for (let j = 0; j < food.length; j++) {
			if (bots[i].collides(food[j])) {
				if (bots[i].r < maxMass) {
					bots[i].r += food[j].r/(massGainedFromFood*bots[i].r/growthAmount);

					if (bots[i].speed > 0.2 || bots[i].r < 100) {
						bots[i].speed = Math.exp(1-.01*bots[i].r);
					}
				}

				food[j].x = randomInt(xMin, xMax);
				food[j].y = randomInt(yMin, yMax);
				food[j].r = randomInt(3, 5);
				food[j].color = colors[randomInt(0, colors.length-1)];
			}
		}

		for (let j = 0; j < mass.length; j++) {
			if (bots[i].collides(mass[j])) {
				if (bots[i].r < maxMass) {
					bots[i].r += mass[j].r/1.4;
				}

				mass.splice(j, 1);
			}
		}
	}

	sortedCells.sort(function (a, b) {
		return a.r-b.r;
	});

	time++;

	//things that all cells experience
	for (let i = 0; i < cells.length; i++) {
		if (time%100 == 0) {
			cells[i].decay();
		}

		if (canDraw(sortedCells[i])) {
			sortedCells[i].drawCell();
		}

		for (let j = 0; j < cells.length; j++) {
			for (let j = 0; j < cells.length; j++) {
				if (i != j && cells[i].eatCell(cells[j])) {
					if (cells[i].r < maxMass) {
						cells[i].r += cells[j].r;

						if (i < cells.length-1 && (bots[i].speed > 0.2 || bots[i].r < 100)) {
							cells[i].speed = Math.exp(-.01*cells[i].r);
						} else if (i == cells.length-1 && player.r < maxMass) {
							graphics.translate(startingX-shiftedX, startingY-shiftedY);
							graphics.scale(1-cells[j].r*(1/250), 1-cells[j].r*(1/250));
							graphics.translate(shiftedX-startingX, shiftedY-startingY);


							totalScaled *= 1-cells[j].r*(1/250);
						}
					}

					if (j == cells.length-1) {
						//Resetting the plane to the origin in order to make translating easier
						graphics.translate(player.x, player.y);

						player.x = randomInt(xMin, yMax);
						player.y = randomInt(yMin, yMax);
					} else {
						cells[j].x = randomInt(xMin, yMax);
						cells[j].y = randomInt(yMin, yMax);
					}

					cells[j].r = 15;
					cells[j].color = colors[randomInt(0, colors.length-1)];

					if (j == cells.length-1) {
						startingX = player.x;
						startingY = player.y;
						shiftedX = 0;
						shiftedY = 0;

						graphics.translate(-player.x, -player.y);

						graphics.translate(startingX-shiftedX, startingY-shiftedY);
						graphics.scale(1/totalScaled, 1/totalScaled);
						graphics.translate(shiftedX-startingX, shiftedY-startingY);

						totalScaled  = 1;
					}
				}
			}
		}
	}

	textSize = player.r/2;

	if (player.r < 10) {
		player.r = 10;
	} else if (player.r > maxMass) {
		player.r = maxMass;
	}
	
	//Where the player's mouse is
	/*graphics.strokeStyle = "white";
	graphics.lineWidth = 1;
	graphics.beginPath();
	graphics.moveTo(player.x, player.y);
	graphics.lineTo(mouseX+shiftedX, mouseY+shiftedY);
	graphics.stroke(); */

	//What angle the player's mouse is at
	//Math.sin(Math.atan(mouseY/mouseX)) and Math.cos(Math.atan((mouseY/mouseX))) correspond to a fixed angle
	/*graphics.strokeStyle = "green";
	graphics.beginPath();
	graphics.moveTo(player.x, player.y);
	if (mouseX > 0) {
		graphics.lineTo(player.x + 200 * Math.cos(Math.atan((mouseY/mouseX))), player.y + 200 * Math.sin(Math.atan(mouseY/mouseX)));
	} else {
		graphics.lineTo(player.x - 200 * Math.cos(Math.atan((mouseY/mouseX))), player.y - 200 * Math.sin(Math.atan(mouseY/mouseX)));
	}
	graphics.stroke(); */

	//border wall
	graphics.strokeStyle = "white";
	graphics.lineWidth = 2;
	graphics.strokeRect(xMin, yMin, totalWidth, totalHeight);

	//Updating the player's position and constraining the player to the border
	if (mouseX < 0 && player.x-player.r > xMin) {
		graphics.translate(-mouseX/speedLimit, 0);
		player.x += mouseX/speedLimit;
		shiftedX -= mouseX/speedLimit;
	}

	if (mouseX > 0 && player.x+player.r < xMax) {
		graphics.translate(-mouseX/speedLimit, 0);
		player.x += mouseX/speedLimit;
		shiftedX -= mouseX/speedLimit;
	}

	if (mouseY < 0 && player.y-player.r > yMin) {
		graphics.translate(0, -mouseY/speedLimit);
		player.y += mouseY/speedLimit;
		shiftedY -= mouseY/speedLimit;
	}

	if (mouseY > 0 && player.y+player.r < yMax) {
		graphics.translate(0, -mouseY/speedLimit);
		player.y += mouseY/speedLimit;
		shiftedY -= mouseY/speedLimit;
	}

	if (speedLimit < 200 || player.r < 100) {
		speedLimit = originalSpeed * Math.exp(.01*player.r);
	}

	if (mouseX < 0) {
		multX = -1;
		multY = -1
	} else {
		multX = 1;
		multY = 1;
	}

	if (player.x-player.r < xMin) {
		player.x = xMin+player.r;
	} else if (player.x+player.r > xMax) {
		player.x = xMax-player.r;
	}

	if (player.y-player.r < yMin) {
		player.y = yMin+player.r;
	} else if (player.y+player.r > yMax) {
		player.y = yMax-player.r;
	}

	/*testing the ejection feature
	graphics.fillStyle = "orange";
	graphics.beginPath();
	graphics.arc(player.x + player.r * multX * Math.cos(Math.atan((mouseY/mouseX))), player.y + player.r * multY * Math.sin(Math.atan(mouseY/mouseX)), 10, 0, pi*2);
	graphics.closePath();
	graphics.fill();

	graphics.fillStyle = "blue";
	graphics.beginPath();
	graphics.arc(player.x, player.y, 10, 0, pi*2);
	graphics.closePath();
	graphics.fill();*/
	
}

function update() {
    draw();

    requestAnimationFrame(update);
}

update();