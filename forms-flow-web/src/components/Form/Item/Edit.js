import React, {useState, useEffect, useReducer } from "react";
import { saveForm, Errors,FormBuilder } from "react-formio";
import { push } from "connected-react-router";
import { useHistory } from "react-router-dom";
import _set from 'lodash/set';
import _cloneDeep from 'lodash/cloneDeep';
import _camelCase from 'lodash/camelCase';
import {
  SUBMISSION_ACCESS,
  ANONYMOUS_ID,
  FORM_ACCESS,
  MULTITENANCY_ENABLED,
} from "../../../constants/constants";
import { addHiddenApplicationComponent } from "../../../constants/applicationComponent";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormProcessesData,
  setFormPreviosData,
} from "../../../actions/processActions";
import { Translation,useTranslation } from "react-i18next";
import { saveFormProcessMapper } from "../../../apiManager/services/processServices";
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { formio_resourceBundles } from "../../../resourceBundles/formio_resourceBundles";
import { clearFormError } from "../../../actions/formActions";
const reducer = (form, {type, value}) => {
  const formCopy = _cloneDeep(form);
  switch (type) {
    case 'formChange':
      for (let prop in value) {
        if (value.hasOwnProperty(prop)) {
          form[prop] = value[prop];
        }
      }
      return form;
    case 'replaceForm':
      return _cloneDeep(value);
    case 'title':
      if (type === 'title' && !form._id) {
        formCopy.name = _camelCase(value);
        formCopy.path = _camelCase(value).toLowerCase();
      }
      break;
    default:
      break;
  }
  _set(formCopy, type, value);
  return formCopy;
};

const Edit = React.memo(() => {
  const dispatch = useDispatch();
  const processListData = useSelector((state) => state.process.formProcessList);
  const formData = useSelector((state) => state.form.form);
  const [form, dispatchFormAction] = useReducer(reducer, _cloneDeep(formData));
  const errors = useSelector((state) => state.form.error);
  const prviousData = useSelector((state) => state.process.formPreviousData);
  const applicationCount = useSelector((state) =>state.process.applicationCount)
  const  formProcessList = useSelector((state)=>state.process.formProcessList)
  const formPreviousData = useSelector((state)=>state.process.formPreviousData)
  const tenantKey = useSelector(state => state.tenants?.tenantId);
  const redirectUrl = MULTITENANCY_ENABLED ? `/tenant/${tenantKey}/` : '/'
  const saveText = (<Translation>{(t)=>t("Save Form")}</Translation>);
  const lang = useSelector((state) => state.user.lang);
  const history = useHistory();
  const {t}=useTranslation();
  const [show, setShow] = useState(false);
  
  const handleClose = () => setShow(false);

  const handleShow = () => setShow(true);
  const handleSave=()=>{
    setShow(false)
    const newFormData = addHiddenApplicationComponent(form);
    newFormData.submissionAccess = SUBMISSION_ACCESS;
    newFormData.access = FORM_ACCESS;

    dispatch(
      saveForm("form", newFormData, (err, submittedData) => {
        if (!err) {
          // checking any changes
          if (
            prviousData.formName !== submittedData.title ||
            prviousData.anonymous !== processListData.anonymous ||
            processListData.anonymous === null
          ) {
            let isTitleChanged= prviousData.formName !== submittedData.title
            let anonymousUpdate =
              processListData.anonymous === null
                ? false
                : processListData.anonymous;
            const data = {
              anonymous: anonymousUpdate,
              formName: submittedData.title,
              id: processListData.id,
              formId: submittedData._id,
            };
            let updated = true
            if(isTitleChanged){
              updated= false
              data.processKey = formPreviousData.processKey
              data.processName = formPreviousData.processName
              data.status= formPreviousData.status
              let version = +formProcessList.version+1
              data.version = `${version}`
            }else if( processListData && processListData.id){
              updated = true
            }
            dispatch(saveFormProcessMapper(data, updated));
            let newData = {
              ...processListData,
              formName: submittedData.title,
            };
            dispatch(setFormProcessesData(newData));
            dispatch(setFormPreviosData({...newData,isTitleChanged}));
          }
          toast.success(t("Form Saved"));
          dispatch(push(`/formflow/${submittedData._id}/preview`));
          // ownProps.setPreviewMode(true);
        } else {
          toast.error("Error while saving Form");
        }
      })
    );

    

  }

  // setting the form data 
  useEffect(() => {
    const newForm= formData;
    if (newForm && (form._id !== newForm._id || form.modified !== newForm.modified)) {
      dispatchFormAction({type: 'replaceForm', value: newForm});
    }
  }, [formData,form]);

// set the anonymous value
  const changeAnonymous = (setvalue) => {
    let latestValue = setvalue||!processListData.anonymous;
    let newData = {
      ...processListData,
      anonymous: latestValue,
    };
    dispatch(setFormProcessesData(newData));
  };

//  chaning the form access
  useEffect(() => {
    FORM_ACCESS.forEach((role) => {
      if (processListData.anonymous) {
        role.roles.push(ANONYMOUS_ID);
      } else {
        role.roles = role.roles.filter((id) => id !== ANONYMOUS_ID);
      }
    });

    SUBMISSION_ACCESS.forEach((access) => {
      if (processListData.anonymous) {
        if (access.type === "create_own") {
          access.roles.push(ANONYMOUS_ID);
        }
      } else {
        if (access.type === "create_own") {
          access.roles = access.roles.filter((id) => id !== ANONYMOUS_ID);
        }
      }
    });
  }, [processListData]);
// save form data to submit
  const saveFormData = () => {
    const newFormData = addHiddenApplicationComponent(form);
    if(prviousData.formName !== newFormData.title && applicationCount >0){
      handleShow()
    }else{
      newFormData.submissionAccess = SUBMISSION_ACCESS;
      newFormData.access = FORM_ACCESS;
  
      dispatch(
        saveForm("form", newFormData, (err, submittedData) => {
          if (!err) {
            // checking any changes
            if (
              prviousData.formName !== submittedData.title ||
              prviousData.anonymous !== processListData.anonymous ||
              processListData.anonymous === null
            ) {
              let isTitleChanged= prviousData.formName !== submittedData.title
              let anonymousUpdate =
                processListData.anonymous === null
                  ? false
                  : processListData.anonymous;
              const data = {
                anonymous: anonymousUpdate,
                formName: submittedData.title,
                id: processListData.id,
                formId: submittedData._id,
              };
              const updated =
                processListData && processListData.id ? true : false;
              dispatch(saveFormProcessMapper(data, updated));
              let newData = {
                ...processListData,
                formName: submittedData.title,
              };
              dispatch(setFormProcessesData(newData));
              dispatch(setFormPreviosData({...newData,isTitleChanged}));
            }
            toast.success(t("Form Saved"));
            dispatch(push(`${redirectUrl}formflow/${submittedData._id}/preview`));
            // ownProps.setPreviewMode(true);
          } else {
            toast.error(t("Error while saving Form"));
          }
        })
      );
    }
    
  };

// setting the main option details to the formdata
  const handleChange = (path, event) => {
    const {target} = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    dispatchFormAction({type: path, value});
  };

  const formChange = (newForm) => dispatchFormAction({type: 'formChange', value: newForm});

// loading up to set the data to the form variable
if(!form._id){
 return <div class="d-flex justify-content-center">
 <div class="spinner-grow" role="status">
  <span class="sr-only"><Translation>{(t)=>t("Loading...")}</Translation></span>
</div>
</div>
}

  return (
    <div className="container">
      <div className="main-header">
        <h3 className="ml-3 task-head">
          <i className="fa fa-wpforms" aria-hidden="true" /> &nbsp;{" "}
          {formData.title}
        </h3>
      </div>

      <hr />
      <Errors errors={errors} />
      <div>
      <div className="row justify-content-end w-100">
       <div id="save-buttons" className=" mr-4 save-buttons pull-right">
          <div className="form-group pull-right">
            <span className="btn btn-secondary" onClick={() =>{ changeAnonymous(prviousData.anonymous); history.goBack();dispatch(clearFormError('form',formData.formName));} }>
            <Translation>{(t)=>t("Cancel")}</Translation>
            </span>
          </div>
        </div>
        <div id="save-buttons" className=" save-buttons pull-right">
          <div className="form-group pull-right">
            <span className="btn btn-primary" onClick={()=>saveFormData()}>
              {saveText}
            </span>
            <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{t("Confirmation")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t("Changing the form title will not affect the existing applications. It will only update in the newly created applications. Press Save Changes to continue or cancel the changes.")}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" onClick={()=>handleSave()}>
            {t("Save Changes")}
          </Button>
        </Modal.Footer>
      </Modal>
          </div>
        </div>
       </div>
      <div className="row">
        <div className="col-lg-4 col-md-4 col-sm-4">
          <div id="form-group-title" className="form-group">
            <label htmlFor="title" className="control-label field-required"><Translation>{(t)=>t("Title")}</Translation></label>
            <input
              type="text"
              className="form-control" id="title"
              placeholder="Enter the form title"
              value={form.title || ''}
              onChange={event => handleChange('title', event)}
            />
          </div>
        </div>
        <div className="col-lg-4 col-md-4 col-sm-4">
          <div id="form-group-name" className="form-group">
            <label htmlFor="name" className="control-label field-required"><Translation>{(t)=>t("Name")}</Translation></label>
            <input
              type="text"
              className="form-control"
              id="name"
              placeholder="Enter the form machine name"
              value={form.name || ''}
              onChange={event => handleChange('name', event)}
            />
          </div>
        </div>
        <div className="col-lg-4 col-md-3 col-sm-3">
          <div id="form-group-display" className="form-group">
            <label htmlFor="name" className="control-label"><Translation>{(t)=>t("Display as")}</Translation></label>
            <div className="input-group">
              <select
                className="form-control"
                name="form-display"
                id="form-display"
                value={form.display || ''}
                onChange={event => handleChange('display', event)}
              >
                <option label="Form" value="form"><Translation>{(t)=>t("Form")}</Translation></option>
                <option label="Wizard" value="wizard"><Translation>{(t)=>t("wizard")}</Translation></option>
              </select>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-3 col-sm-3">
          <div id="form-group-type" className="form-group">
            <label htmlFor="form-type" className="control-label"><Translation>{(t)=>t("Type")}</Translation></label>
            <div className="input-group">
              <select
                className="form-control"
                name="form-type"
                id="form-type"
                value={form.type}
                onChange={event => handleChange('type', event)}
              >
                <option label="Form" value="form"><Translation>{(t)=>t("form")}</Translation></option>
                <option label="Resource" value="resource">Resource</option>
              </select>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-4 col-sm-4">
          <div id="form-group-path" className="form-group">
            <label htmlFor="path" className="control-label field-required"><Translation>{(t)=>t("Path")}</Translation></label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="path"
                placeholder="example"
                style={{'textTransform': 'lowercase', width:'120px'}}
                value={form.path || ''}
                onChange={event => handleChange('path', event)}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-4 col-sm-4">
          <div id="form-group-anonymous" className="form-group d-flex ml-5" style={{marginTop:"30px"}}>
             <label htmlFor="anonymousLabel" className=" form-control control-label border-0 " style={{fontSize:"16px"}} >{t("Make this form public ?")}</label>
            <div className="input-group align-items-center">
              <input  
               className="m-0" style={{height:'20px', width:'20px'}}
                type="checkbox"
                id="anonymous"
                title="Check Anonymous"
                checked={processListData.anonymous || false}
                onChange={(e) => {
                  changeAnonymous();
                }}
              />
            </div>
          </div>
        </div>
     
      </div>
      <FormBuilder
        key={form._id}
        form={form}
        onChange={formChange}
        options={{
          language: lang,
          i18n: formio_resourceBundles
          }}
          
      />
    </div>
    </div>
  );
});
export default Edit;
