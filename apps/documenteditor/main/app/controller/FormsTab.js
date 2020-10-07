/*
 *
 * (c) Copyright Ascensio System SIA 2010-2020
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

/**
 *  FormsTab.js
 *
 *  Created by Julia Radzhabova on 06.10.2020
 *  Copyright (c) 2020 Ascensio System SIA. All rights reserved.
 *
 */

define([
    'core',
    'documenteditor/main/app/view/FormsTab'
], function () {
    'use strict';

    DE.Controllers.FormsTab = Backbone.Controller.extend(_.extend({
        models : [],
        collections : [
        ],
        views : [
            'FormsTab'
        ],
        sdkViewName : '#id_main',

        initialize: function () {
        },
        onLaunch: function () {
            this._state = {
                prcontrolsdisable:undefined
            };
        },

        setApi: function (api) {
            if (api) {
                this.api = api;
                this.api.asc_registerCallback('asc_onFocusObject', this.onApiFocusObject.bind(this));
                this.api.asc_registerCallback('asc_onCoAuthoringDisconnect',_.bind(this.onCoAuthoringDisconnect, this));
                Common.NotificationCenter.on('api:disconnect', _.bind(this.onCoAuthoringDisconnect, this));
                this.api.asc_registerCallback('asc_onChangeSdtGlobalSettings', _.bind(this.onChangeSdtGlobalSettings, this));
                this.api.asc_registerCallback('asc_onSendThemeColors', _.bind(this.onSendThemeColors, this));

                // this.api.asc_registerCallback('asc_onShowContentControlsActions',_.bind(this.onShowContentControlsActions, this));
                // this.api.asc_registerCallback('asc_onHideContentControlsActions',_.bind(this.onHideContentControlsActions, this));
            }
            return this;
        },

        setConfig: function(config) {
            this.toolbar = config.toolbar;
            this.view = this.createView('FormsTab', {
                toolbar: this.toolbar.toolbar
            });
            this.addListeners({
                'FormsTab': {
                    'forms:insert': this.onControlsSelect,
                    'forms:new-color': this.onNewControlsColor,
                    'forms:clear': this.onClearClick,
                    'forms:no-color': this.onNoControlsColor,
                    'forms:select-color': this.onSelectControlsColor,
                    'forms:open-color': this.onColorsShow,
                    'forms:mode': this.onModeClick
                }
            });
        },

        SetDisabled: function(state) {
            this.view && this.view.SetDisabled(state);
        },

        getView: function(name) {
            return !name && this.view ?
                this.view : Backbone.Controller.prototype.getView.call(this, name);
        },

        onCoAuthoringDisconnect: function() {
            this.SetDisabled(true);
        },

        onApiFocusObject: function(selectedObjects) {
            if (!this.toolbar.editMode) return;

            var pr, i = -1, type,
                paragraph_locked = false,
                header_locked = false;

            while (++i < selectedObjects.length) {
                type = selectedObjects[i].get_ObjectType();
                pr   = selectedObjects[i].get_ObjectValue();

                if (type === Asc.c_oAscTypeSelectElement.Paragraph) {
                    paragraph_locked = pr.get_Locked();
                } else if (type === Asc.c_oAscTypeSelectElement.Header) {
                    header_locked = pr.get_Locked();
                }
            }
            var in_control = this.api.asc_IsContentControl();
            var control_props = in_control ? this.api.asc_GetContentControlProperties() : null,
                lock_type = (in_control&&control_props) ? control_props.get_Lock() : Asc.c_oAscSdtLockType.Unlocked,
                control_plain = (in_control&&control_props) ? (control_props.get_ContentControlType()==Asc.c_oAscSdtLevelType.Inline) : false;
            (lock_type===undefined) && (lock_type = Asc.c_oAscSdtLockType.Unlocked);
            var content_locked = lock_type==Asc.c_oAscSdtLockType.SdtContentLocked || lock_type==Asc.c_oAscSdtLockType.ContentLocked;
            var need_disable = (paragraph_locked || header_locked || control_plain || content_locked);
            if (this._state.prcontrolsdisable !== need_disable) {
                this.view.btnTextField.setDisabled(need_disable);
                this.view.btnComboBox.setDisabled(need_disable);
                this.view.btnDropDown.setDisabled(need_disable);
                this.view.btnCheckBox.setDisabled(need_disable);
                this.view.btnRadioBox.setDisabled(need_disable);
                this.view.btnImageField.setDisabled(need_disable);
                this.view.btnTextField.setDisabled(need_disable);
                this._state.prcontrolsdisable = need_disable;
            }
        },

        onSendThemeColors: function() {
            this._needUpdateColors = true;
        },

        updateThemeColors: function() {
            var updateColors = function(picker, defaultColorIndex) {
                if (picker) {
                    var clr;

                    var effectcolors = Common.Utils.ThemeColor.getEffectColors();
                    for (var i = 0; i < effectcolors.length; i++) {
                        if (typeof(picker.currentColor) == 'object' &&
                            clr === undefined &&
                            picker.currentColor.effectId == effectcolors[i].effectId)
                            clr = effectcolors[i];
                    }

                    picker.updateColors(effectcolors, Common.Utils.ThemeColor.getStandartColors());
                    if (picker.currentColor === undefined) {
                        picker.currentColor = effectcolors[defaultColorIndex];
                    } else if ( clr!==undefined ) {
                        picker.currentColor = clr;
                    }
                }
            };

            this.view && this.view.mnuFormsColorPicker && updateColors(this.view.mnuFormsColorPicker, 1);
            this.onChangeSdtGlobalSettings();
        },

        onChangeSdtGlobalSettings: function() {
            if (this.view && this.view.mnuFormsColorPicker) {
                var show = this.api.asc_GetGlobalContentControlShowHighlight(),
                    clr;
                this.view.mnuNoFormsColor.setChecked(!show, true);
                this.view.mnuFormsColorPicker.clearSelection();
                if (show){
                    clr = this.api.asc_GetGlobalContentControlHighlightColor();
                    if (clr) {
                        clr = Common.Utils.ThemeColor.getHexColor(clr.get_r(), clr.get_g(), clr.get_b());
                        this.view.mnuFormsColorPicker.selectByRGB(clr, true);
                    }
                }
                this.view.btnHighlight.currentColor = clr;
                $('.btn-color-value-line', this.view.btnHighlight.cmpEl).css('background-color', clr ? '#' + clr : 'transparent');
            }
        },

        onColorsShow: function(menu) {
            this._needUpdateColors && this.updateThemeColors();
            this._needUpdateColors = false;
        },

        onControlsSelect: function(type) {
            if (!(this.toolbar.mode && this.toolbar.mode.canFeatureContentControl)) return;

            var oPr,
                oFormPr = new AscCommon.CSdtFormPr();
            this.toolbar.toolbar.fireEvent('insertcontrol', this.toolbar.toolbar);
            if (type == 'picture')
                this.api.asc_AddContentControlPicture(oFormPr);
            else if (type == 'checkbox' || type == 'radiobox') {
                oPr = new AscCommon.CSdtCheckBoxPr();
                (type == 'radiobox') && oPr.put_GroupKey('Group 1');
                this.api.asc_AddContentControlCheckBox(oPr, oFormPr);
            } else if (type == 'combobox' || type == 'dropdown')
                this.api.asc_AddContentControlList(type == 'combobox', oPr, oFormPr);
            else if (type == 'text') {
                oPr = new AscCommon.CSdtTextFormPr();
                this.api.asc_AddContentControlTextForm(oPr, oFormPr);
            }
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onModeClick: function(state) {
            if (this.api) {

            }
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onClearClick: function() {
            if (this.api) {
                // this.api.asc_ClearControls();
            }
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onNewControlsColor: function() {
            this.view.mnuFormsColorPicker.addNewColor();
        },

        onNoControlsColor: function(item) {
            if (!item.isChecked())
                this.api.asc_SetGlobalContentControlShowHighlight(true, 220, 220, 220);
            else
                this.api.asc_SetGlobalContentControlShowHighlight(false);
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onSelectControlsColor: function(color) {
            var clr = Common.Utils.ThemeColor.getRgbColor(color);
            if (this.api) {
                this.api.asc_SetGlobalContentControlShowHighlight(true, clr.get_r(), clr.get_g(), clr.get_b());
            }
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        }

    }, DE.Controllers.FormsTab || {}));
});