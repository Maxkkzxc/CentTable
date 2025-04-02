using System.Security.Claims;
using CentTable.Data;
using CentTable.Models;
using CentTable.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
using System.Linq;
using System.Threading.Tasks;
using CentTable.Enums;
using System.Reflection;
using System.Linq.Dynamic.Core;

namespace CentTable.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DataGridController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public DataGridController(AppDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetDataGrids()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var query = _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(dg => dg.IsPublic || dg.Permissions.Any(p => p.UserId == userId && p.CanView));
            }

            var grids = await query.ToListAsync();
            return Ok(grids);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDataGrid(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var grid = await _context.DataGrids
                .AsNoTracking()
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            if (!grid.IsPublic && !isAdmin && !grid.Permissions.Any(p => p.UserId == userId && p.CanView))
                return Forbid();


            return Ok(grid);
        }


        [HttpPost("create")]
        public async Task<IActionResult> CreateDataGrid([FromBody] CreateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var grid = new DataGrid
            {
                Name = model.Name,
                IsPublic = model.IsPublic,
                Columns = model.Columns.Select(c => new Column
                {
                    Name = c.Name,
                    Type = c.Type,
                    ValidationRegex = c.ValidationRegex,
                    Options = c.Options,
                    MaxLength = c.MaxLength,
                    MinValue = c.MinValue,
                    MaxValue = c.MaxValue
                }).ToList()
            };

            _context.DataGrids.Add(grid);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, "Ошибка при сохранении таблицы: " + ex.Message);
            }

            var defaultRow = new Row
            {
                DataGridId = grid.Id,
                Cells = new List<Cell>()
            };

            foreach (var col in grid.Columns)
            {
                defaultRow.Cells.Add(new Cell
                {
                    ColumnId = col.Id,
                    Value = "" 
                });
            }

            _context.Rows.Add(defaultRow);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, "Ошибка при сохранении строки: " + ex.Message);
            }

            var loadedGrid = await _context.DataGrids
                                   .Include(g => g.Columns)
                                   .Include(g => g.Rows)
                                       .ThenInclude(r => r.Cells)
                                   .FirstOrDefaultAsync(g => g.Id == grid.Id);

            return Ok(loadedGrid);
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDataGrid(int id, [FromBody] UpdateDataGridModel model)
        {
            if (model == null)
                return BadRequest("Модель равна null");

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
            if (!isAdmin && !grid.Permissions.Any(p => p.UserId == userId && p.CanEdit))
                return Forbid();

            grid.Name = model.Name;
            grid.IsPublic = model.IsPublic;

            var modelColumnIds = model.Columns.Where(c => c.Id != 0).Select(c => c.Id).ToList();
            var columnsToRemove = grid.Columns.Where(c => !modelColumnIds.Contains(c.Id)).ToList();
            foreach (var col in columnsToRemove)
            {
                foreach (var row in grid.Rows.ToList())
                {
                    var cellsToRemove = row.Cells.Where(c => c.ColumnId == col.Id).ToList();
                    foreach (var cell in cellsToRemove)
                    {
                        _context.Cells.Remove(cell);
                        row.Cells.Remove(cell);
                    }
                }
                _context.Columns.Remove(col);
            }

            foreach (var colModel in model.Columns)
            {
                if (colModel.Id != 0)
                {
                    var col = grid.Columns.FirstOrDefault(c => c.Id == colModel.Id);
                    if (col != null)
                    {
                        col.Name = colModel.Name;
                        col.Type = colModel.Type;
                        col.ValidationRegex = colModel.ValidationRegex;
                        col.Options = colModel.Options;
                    }
                }
                else
                {
                    var newCol = new Column
                    {
                        Name = colModel.Name,
                        Type = colModel.Type,
                        ValidationRegex = colModel.ValidationRegex,
                        Options = colModel.Options,
                        DataGrid = grid
                    };
                    grid.Columns.Add(newCol);

                    foreach (var row in grid.Rows)
                    {
                        row.Cells.Add(new Cell { Column = newCol, Value = "", Row = row });
                    }
                }
            }

            foreach (var rowModel in model.Rows)
            {
                var row = grid.Rows.FirstOrDefault(r => r.Id == rowModel.Id);
                if (row != null)
                {
                    foreach (var cellModel in rowModel.Cells)
                    {
                        var cell = row.Cells.FirstOrDefault(c => c.ColumnId == cellModel.ColumnId);
                        if (cell != null)
                        {
                            if (cellModel.Value is JArray jArray)
                            {
                                var arr = jArray.ToObject<System.Collections.Generic.List<string>>();
                                cell.Value = string.Join(",", arr);
                            }
                            else
                            {
                                cell.Value = cellModel.Value?.ToString();
                            }
                        }
                        else
                        {
                            string value = cellModel.Value?.ToString() ?? "";
                            row.Cells.Add(new Cell { ColumnId = cellModel.ColumnId, Value = value, Row = row });
                        }
                    }
                    var existingCellColumnIds = row.Cells.Select(c => c.ColumnId).ToList();
                    foreach (var col in grid.Columns)
                    {
                        if (!existingCellColumnIds.Contains(col.Id))
                        {
                            row.Cells.Add(new Cell { ColumnId = col.Id, Value = "", Row = row });
                        }
                    }
                }
                else
                {
                    var newRow = new Row
                    {
                        DataGridId = grid.Id,
                        Cells = new System.Collections.Generic.List<Cell>()
                    };
                    foreach (var cellModel in rowModel.Cells)
                    {
                        string value = cellModel.Value?.ToString() ?? "";
                        newRow.Cells.Add(new Cell { ColumnId = cellModel.ColumnId, Value = value, Row = newRow });
                    }
                    grid.Rows.Add(newRow);
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, "Ошибка при обновлении таблицы: " + ex.Message);
            }

            return Ok(grid);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDataGrid(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            var grid = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            if (!isAdmin && !grid.Permissions.Any(p => p.UserId == userId && p.CanDelete))
                return Forbid();

            _context.DataGrids.Remove(grid);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("{id}/permissions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePermissions(int id, [FromBody] UpdateDataGridPermissionsModel model)
        {
            if (id != model.DataGridId)
                return BadRequest("Некорректный идентификатор таблицы.");

            var grid = await _context.DataGrids
                .Include(dg => dg.Permissions)
                .FirstOrDefaultAsync(dg => dg.Id == id);

            if (grid == null)
                return NotFound();

            if (grid.Permissions.Any())
            {
                _context.DataGridPermissions.RemoveRange(grid.Permissions);
            }
            grid.Permissions.Clear();

            foreach (var permModel in model.Permissions)
            {
                grid.Permissions.Add(new DataGridPermission
                {
                    DataGridId = id,
                    UserId = permModel.UserId,
                    CanView = permModel.CanView,
                    CanEdit = permModel.CanEdit,
                    CanDelete = permModel.CanDelete
                });
            }

            try
            {
                await _context.SaveChangesAsync();
                grid = await _context.DataGrids
                    .Include(dg => dg.Permissions)
                    .FirstOrDefaultAsync(dg => dg.Id == id);
                return Ok(grid);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, "Ошибка при обновлении разрешений: " + ex.Message);
            }
        }

        [HttpGet("all-records")]
        public async Task<IActionResult> GetAllRecords()
        {
            var grids = await _context.DataGrids
                .Include(dg => dg.Columns)
                .Include(dg => dg.Rows)
                    .ThenInclude(r => r.Cells)
                .ToListAsync();

            var result = new List<object>();

            foreach (var grid in grids)
            {
                var columns = grid.Columns.Select(c => new { id = c.Id, name = c.Name }).ToList();

                foreach (var row in grid.Rows)
                {
                    var cellValues = new Dictionary<int, string>();
                    foreach (var cell in row.Cells)
                    {
                        cellValues[cell.ColumnId] = cell.Value;
                    }
                    result.Add(new
                    {
                        gridId = grid.Id,
                        gridName = grid.Name,
                        rowId = row.Id,
                        cellValues = cellValues,
                        columns = columns
                    });
                }
            }
            return Ok(result);
        }

        [HttpPost("batch-delete")]
        public async Task<IActionResult> BatchDeleteRows([FromBody] BatchDeleteModel model)
        {
            if (model == null || model.RowIds == null || !model.RowIds.Any())
                return BadRequest("Список строк пуст");

            var rows = await _context.Rows
                .Where(r => model.RowIds.Contains(r.Id))
                .Include(r => r.Cells)
                .ToListAsync();

            if (rows.Count == 0)
                return NotFound("Ни одна строка не найдена");

            foreach (var row in rows)
            {
                _context.Cells.RemoveRange(row.Cells);
            }

            _context.Rows.RemoveRange(rows);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var innerMessage = ex.InnerException?.Message ?? "Нет дополнительной информации";
                return StatusCode(500, $"Ошибка удаления строк: {innerMessage}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ошибка удаления строк: {ex.Message}");
            }

            return Ok(new { Deleted = rows.Count });
        }

        [HttpPost("batch-insert")]
        public async Task<IActionResult> BatchInsertRows([FromBody] BatchInsertModel model)
        {
            if (model == null || model.Rows == null || !model.Rows.Any())
                return BadRequest("Нет строк для вставки");

            var dataGrid = await _context.DataGrids
                                 .Include(dg => dg.Columns)
                                 .Include(dg => dg.Rows)
                                 .FirstOrDefaultAsync(dg => dg.Id == model.DataGridId);
            if (dataGrid == null)
                return NotFound("DataGrid не найден");

            foreach (var copyRow in model.Rows)
            {
                var newRow = new Row
                {
                    DataGridId = dataGrid.Id,
                    Cells = new List<Cell>()
                };

                foreach (var copyCell in copyRow.Cells)
                {
                    if (dataGrid.Columns.Any(c => c.Id == copyCell.ColumnId))
                    {
                        newRow.Cells.Add(new Cell
                        {
                            ColumnId = copyCell.ColumnId,
                            Value = copyCell.Value ?? ""
                        });
                    }
                }

                dataGrid.Rows.Add(newRow);
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Ошибка при вставке строк: " + ex.Message);
            }

            return Ok(new { Inserted = model.Rows.Count });
        }

    }
}