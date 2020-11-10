// Algorithm taken from:
// mikolalysenko / mikolalysenko.github.com

export class Mesher {
    quadCreatorXDirection(i, j, k, width, height, direction, offset) {
        // Each row is an edge of the quad
        // The only thing important here is the direction, since the order of the
        // quad vertices is relevant for the normal

        // The order for all those things is: top-right, top-left, bottom-left, bottom-right
        // TODO: change the order to start from the bottom-left. Then change the triangle function

        i += offset[0];
        j += offset[1];
        height += offset[1];
        k += offset[2];
        width += offset[2];

        if (direction == 0) {
            return [
                [i, height, width],
                [i, height, k],
                [i, j, k],
                [i, j, width],
            ];
        } else {
            return [
                [i, height, k],
                [i, height, width],
                [i, j, width],
                [i, j, k],
            ];
        }
    }

    quadCreatorZDirection(i,  j,  k,  width,  height, direction, offset) {
        // Each row is an edge of the quad
        // The only thing important here is the direction, since the order of the
        // quad vertices is relevant for the normal

        i += offset[2];
        j += offset[1];
        height += offset[1];
        k += offset[0];
        width += offset[0];

        if (direction == 0) {
            return [
                [k, height, i],
                [width, height, i],
                [width, j, i],
                [k, j, i],
            ];
        } else {
            return [
                [width, height, i],
                [k, height, i],
                [k, j, i],
                [width, j, i],
            ];
        }
    }

    quadCreatorYDirection(i,  j,  k,  width,  height, direction, offset) {
        // Each row is an edge of the quad
        // The only thing important here is the direction, since the order of the
        // quad vertices is relevant for the normal
        
        i += offset[1];
        j += offset[2];
        height += offset[2];
        k += offset[0];
        width += offset[0];

        if (direction == 0) {
            return [
                [width, i, height],
                [k, i, height],
                [k, i, j],
                [width, i, j],
            ];
        } else {
            return [
                [k, i, height],
                [width, i, height],
                [width, i, j],
                [k, i, j],
            ];
        }
    }

    mesh(voxels, offset) {
        let result = [];

        let dirMap = {
            0: 'x',
            1: 'y',
            2: 'z',
        };

        // For each dimension, scan over the planes, which consist of the other two dimensions
        for (let dimension = 0; dimension < 3; dimension++) {
            // Setup the necessary getter information
            let getter;
            let quadCreator;
            let sizes;
            if (dimension == 0) {
                getter = (i, j, k) => voxels[i][j][k];
                quadCreator = this.quadCreatorXDirection;
                sizes = [voxels.length, voxels[0].length, voxels[0][0].length];
            } else if (dimension == 1) {
                getter = (i, j, k) => voxels[k][i][j];
                quadCreator = this.quadCreatorYDirection;
                sizes = [voxels[0].length, voxels[0][0].length, voxels.length];
            } else {
                getter = (i, j, k) => voxels[k][j][i];
                quadCreator = this.quadCreatorZDirection;
                sizes = [voxels[0][0].length, voxels[0].length, voxels.length];
            }

            // Generate a mask the size of the remaining dimensions, this will be the plane we check
            let mask = new Array(sizes[1]);
            for (let i = 0; i < mask.length; i++) {
                mask[i] = new Array(sizes[2]);
            }

            // This is the dimension we iterate over
            // We need to iterate over one more plane, which will be the 'backside' of the voxels
            //     This is because the mask we build will be the difference between two plans
            //.    Therefore n-1 between the planes + 2 on the outside
            // That leads to 'i <= sizes[0]' and not 'i < sizes[0]'
            for (let i = 0; i <= sizes[0]; i++) {

                // The following two loops are the plane we are checking
                // If the voxels differ from the last plane, change the mask accordingly
                for (let j = 0; j < sizes[1]; j++) {
                    for (let k = 0; k < sizes[2]; k++) {
                        // We need to check the value here to avoid out of bounds
                        // The mask is set to 1, when the previous plane had a different value in the same position
                        if (i == 0) {
                            mask[j][k] = getter(i, j, k);
                        } else if (i == sizes[0]) {
                            mask[j][k] = -getter(i - 1, j, k);
                        } else {
                            if (getter(i - 1, j, k) == 0 && getter(i, j, k) != 0) {
                                mask[j][k] = getter(i, j, k);
                            } else if (getter(i - 1, j, k) != 0 && getter(i, j, k) == 0) {
                                mask[j][k] = -getter(i - 1, j, k);
                            } else {
                                mask[j][k] = 0;
                            }
                        }
                    }
                }

                // For each filled mask, create meshes
                // So we iterate over the mask again
                for (let j = 0; j < sizes[1]; j++) {
                    for (let k = 0; k < sizes[2]; k++) {
                        if (mask[j][k] == 0) {
                            continue;
                        }

                        let type = mask[j][k];

                        // The wording in the next bit is a bit wild.
                        // width would be more correctly kEnd
                        // height would be more correctly jEnd
                        // But for some reason width and height are easier to differentiate, so not 100% correct, we go with them

                        // We found a set voxel here
                        // So let's calculate the width
                        let width;
                        for (width = k; width < sizes[2]; width++) {
                            if (mask[j][width] != type) {
                                break;
                            }
                            mask[j][width] = 0;
                        }

                        // Now we need the height
                        // Since meshes need to be rectangular, each row, which will increase the height, must have the same width
                        // as the row checked to find the width. We therefore look into the next row and iterate from k to width
                        let valid = true;
                        let height;
                        for (height = j + 1; height < sizes[1]; height++) {
                            for (let l = k; l < width; l++) {
                                // if we find an invalid position here, the whole row is invalid
                                if (mask[height][l] != type) {
                                    valid = false;
                                    break;
                                }
                            }

                            if (valid) {
                                // The row is valid, so we set everything to be touched and continue, which will increase the height
                                for (let l = k; l < width; l++) {
                                    mask[height][l] = 0;
                                }
                            } else {
                                // If the row is not valid, we found the height
                                break;
                            }
                        }

                        let direction = type > 0 ? 0 : 1;

                        // With the found i, j, k, width and height, we create a quad
                        result.push({
                            quad: quadCreator(i, j, k, width, height, direction, offset),
                            type: Math.abs(type),
                            width: width-k,
                            height: height-j,
                            direction: dirMap[dimension] + (direction == 0 ? 'positive' : 'negative'),
                        });
                    }
                }
            }

        }

        return result;
    }

    splitQuads(quads) {
        let result = [];

        for (let _quad of quads) {
            let quad = _quad.quad;

            result.push({triangle: [quad[2], quad[0], quad[1]], type: _quad.type, width: _quad.width, height: _quad.height, direction: _quad.direction});
            result.push({triangle: [quad[2], quad[3], quad[0]], type: _quad.type, width: _quad.width, height: _quad.height, direction: _quad.direction});
        }

        return result;
    }
}
