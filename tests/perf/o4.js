// perf test 4. exported from pipeline test page.
export default {
  "paths": ["_ROOT_PATH_"],
  "branchName": "_ROOT_BRANCH_",
  "branchId": "_ROOT_BRANCH_",
  "path": {
    "_ROOT_PATH_": {
      "children": [{
        "branchName": "SECTION",
        "branchId": "SECTION",
        "paths": ["0"],
        "path": {
          "0": {
            "children": [{
              "branchName": "VERSE_INDEX",
              "branchId": "VERSE_INDEX",
              "paths": ["0"],
              "path": {
                "0": {
                  "data": {
                    "$class": ["layout", "one", "w-headline", "w-title", "w-divider", "w-decoration"],
                    "$diff_index": 0,
                    "$item_index": 0
                  }
                }
              }
            }, {"branchName": "ITEM_INDEX", "branchId": "ITEM_INDEX", "paths": ["0"]}]
          }
        }
      }]
    }
  },
  "countByNames": {"SECTION": 1, "VERSE_INDEX": 1, "ITEM_INDEX": 1},
  "branchesById": {
    "SECTION": {
      "branchName": "SECTION",
      "branchId": "SECTION",
      "paths": ["0"],
      "path": {
        "0": {
          "children": [{
            "branchName": "VERSE_INDEX",
            "branchId": "VERSE_INDEX",
            "paths": ["0"],
            "path": {
              "0": {
                "data": {
                  "$class": ["layout", "one", "w-headline", "w-title", "w-divider", "w-decoration"],
                  "$diff_index": 0,
                  "$item_index": 0
                }
              }
            }
          }, {"branchName": "ITEM_INDEX", "branchId": "ITEM_INDEX", "paths": ["0"]}]
        }
      }
    },
    "VERSE_INDEX": {
      "branchName": "VERSE_INDEX",
      "branchId": "VERSE_INDEX",
      "paths": ["0"],
      "path": {
        "0": {
          "data": {
            "$class": ["layout", "one", "w-headline", "w-title", "w-divider", "w-decoration"],
            "$diff_index": 0,
            "$item_index": 0
          }
        }
      }
    },
    "ITEM_INDEX": {"branchName": "ITEM_INDEX", "branchId": "ITEM_INDEX", "paths": ["0"]}
  },
  "branchNames": ["SECTION", "VERSE_INDEX", "ITEM_INDEX"]
};
